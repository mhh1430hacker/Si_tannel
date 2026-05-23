"""
Google Form Scraper: Extracts questions, choices, and images from public Google Forms.

Uses the FB_PUBLIC_LOAD_DATA_ JavaScript variable embedded in the form HTML.
No OAuth or API key required — only works with PUBLIC forms.
"""

import json
import re
from dataclasses import dataclass, field

import httpx

# Google Forms question type IDs (from FB_PUBLIC_LOAD_DATA_ structure)
QUESTION_TYPE_SHORT_TEXT = 0
QUESTION_TYPE_LONG_TEXT = 1
QUESTION_TYPE_MULTIPLE_CHOICE = 2
QUESTION_TYPE_DROPDOWN = 3
QUESTION_TYPE_CHECKBOXES = 4
QUESTION_TYPE_LINEAR_SCALE = 5
QUESTION_TYPE_GRID = 7

# Types that map to our MCQ format
MCQ_COMPATIBLE_TYPES = {
    QUESTION_TYPE_MULTIPLE_CHOICE,
    QUESTION_TYPE_DROPDOWN,
    QUESTION_TYPE_CHECKBOXES,
}


@dataclass
class FormChoice:
    text: str
    image_url: str | None = None


@dataclass
class FormQuestion:
    question_id: str
    text: str
    question_type: int
    choices: list[FormChoice] = field(default_factory=list)
    image_url: str | None = None
    is_required: bool = False


@dataclass
class FormData:
    title: str
    description: str
    questions: list[FormQuestion] = field(default_factory=list)
    form_url: str = ""


def _normalize_form_url(url: str) -> str:
    """
    Normalize various Google Form URL formats to the viewform URL.
    Handles:
    - https://docs.google.com/forms/d/e/{ID}/viewform
    - https://docs.google.com/forms/d/{ID}/edit
    - https://forms.gle/{SHORT_ID}
    """
    url = url.strip()

    # Handle short links (forms.gle)
    if "forms.gle" in url:
        return url

    # Extract form ID and build viewform URL
    match = re.search(r"/forms/d/(?:e/)?([a-zA-Z0-9_-]+)", url)
    if match:
        form_id = match.group(1)
        # Check if it's already an /e/ format
        if "/forms/d/e/" in url:
            return f"https://docs.google.com/forms/d/e/{form_id}/viewform"
        else:
            return f"https://docs.google.com/forms/d/{form_id}/viewform"

    return url


def _extract_fb_public_load_data(html: str) -> list | None:
    """
    Extract the FB_PUBLIC_LOAD_DATA_ variable from the form HTML.
    This is the main data structure containing all form questions.
    """
    pattern = r"var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\]);\s*<\/script>"
    match = re.search(pattern, html, re.DOTALL)
    if not match:
        # Try alternate pattern without semicolon + script close
        pattern2 = r"FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\]);"
        match = re.search(pattern2, html, re.DOTALL)
    if not match:
        return None

    raw_json = match.group(1)
    try:
        return json.loads(raw_json)
    except json.JSONDecodeError:
        return None


def _extract_image_url(item_data: list) -> str | None:
    """
    Extract image URL from a question or choice item.
    Images are typically at index [6] in the question data with structure [url, ...].
    """
    try:
        # Image data can be in various positions depending on form structure
        # Common positions: item[6][0] or item[6][2]
        if item_data and len(item_data) > 6 and item_data[6]:
            img_data = item_data[6]
            if isinstance(img_data, list) and len(img_data) > 0:
                # The URL is typically the first string in the image data
                for elem in img_data:
                    if isinstance(elem, str) and ("googleusercontent.com" in elem or "ggpht.com" in elem or "lh" in elem):
                        return elem
                    if isinstance(elem, list):
                        for sub in elem:
                            if isinstance(sub, str) and ("googleusercontent.com" in sub or "ggpht.com" in sub or "http" in sub):
                                return sub
    except (IndexError, TypeError):
        pass
    return None


def _extract_question_image(question_data: list) -> str | None:
    """
    Extract image from the question header area.
    In the FB_PUBLIC_LOAD_DATA_ structure, question images appear at specific indices.
    """
    try:
        # Image attached to the question description area
        # Usually at index [6] of the question container
        if len(question_data) > 6 and question_data[6]:
            img_info = question_data[6]
            if isinstance(img_info, list):
                for item in img_info:
                    if isinstance(item, str) and item.startswith("http"):
                        return item
                    if isinstance(item, list):
                        for sub in item:
                            if isinstance(sub, str) and sub.startswith("http"):
                                return sub
    except (IndexError, TypeError):
        pass

    # Also check index [4][0][6] for inline question images
    try:
        if len(question_data) > 4 and question_data[4]:
            q_inner = question_data[4][0]
            if len(q_inner) > 6 and q_inner[6]:
                img_info = q_inner[6]
                if isinstance(img_info, list):
                    for item in img_info:
                        if isinstance(item, str) and item.startswith("http"):
                            return item
                        if isinstance(item, list):
                            for sub in item:
                                if isinstance(sub, str) and sub.startswith("http"):
                                    return sub
    except (IndexError, TypeError):
        pass

    return None


def _parse_questions(data: list) -> list[FormQuestion]:
    """
    Parse questions from the FB_PUBLIC_LOAD_DATA_ structure.
    The question list is typically at data[1][1].
    """
    questions: list[FormQuestion] = []

    try:
        items = data[1][1]
    except (IndexError, TypeError):
        return questions

    if not items:
        return questions

    for item in items:
        try:
            # item[1] = question title/text
            # item[3] = question ID (string)
            # item[4] = question details array (type, choices, etc.)

            title = item[1] if len(item) > 1 and item[1] else ""
            question_id = str(item[3]) if len(item) > 3 and item[3] else ""

            # Extract image from question container
            image_url = _extract_question_image(item)

            # Get the question details (type and choices)
            if len(item) <= 4 or not item[4]:
                # This might be a section header / description, skip
                continue

            q_details = item[4][0]  # First question element in the item
            if not q_details:
                continue

            # q_details[3] = question type
            q_type = q_details[3] if len(q_details) > 3 else -1

            # q_details[4] = required flag position varies
            is_required = False
            try:
                if len(q_details) > 4 and q_details[4]:
                    is_required = bool(q_details[4][0][2]) if len(q_details[4][0]) > 2 else False
            except (IndexError, TypeError):
                pass

            # Extract choices for MCQ-compatible types
            choices: list[FormChoice] = []
            if q_type in MCQ_COMPATIBLE_TYPES:
                try:
                    options_list = q_details[1]
                    if options_list:
                        for opt in options_list:
                            choice_text = opt[0] if opt and len(opt) > 0 else ""
                            # Choice image at opt[3] or opt[2]
                            choice_img = None
                            try:
                                if len(opt) > 3 and opt[3]:
                                    img_data = opt[3]
                                    if isinstance(img_data, list) and len(img_data) > 0:
                                        for elem in img_data:
                                            if isinstance(elem, str) and elem.startswith("http"):
                                                choice_img = elem
                                                break
                            except (IndexError, TypeError):
                                pass

                            if choice_text:
                                choices.append(FormChoice(
                                    text=choice_text,
                                    image_url=choice_img,
                                ))
                except (IndexError, TypeError):
                    pass

            # Also check for image in the question details level
            if not image_url:
                try:
                    if len(q_details) > 6 and q_details[6]:
                        img_data = q_details[6]
                        if isinstance(img_data, list):
                            for elem in img_data:
                                if isinstance(elem, str) and elem.startswith("http"):
                                    image_url = elem
                                    break
                except (IndexError, TypeError):
                    pass

            questions.append(FormQuestion(
                question_id=question_id,
                text=title,
                question_type=q_type,
                choices=choices,
                image_url=image_url,
                is_required=is_required,
            ))

        except (IndexError, TypeError):
            continue

    return questions


async def scrape_google_form(url: str) -> FormData:
    """
    Scrape a public Google Form and extract all questions with their choices.

    Args:
        url: Any valid Google Form URL (viewform, edit, or short link)

    Returns:
        FormData containing title, description, and all extracted questions

    Raises:
        ValueError: If the URL is invalid or the form cannot be accessed
        ConnectionError: If the form cannot be fetched
    """
    normalized_url = _normalize_form_url(url)

    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        try:
            response = await client.get(normalized_url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept-Language": "ar,en;q=0.9",
            })
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise ValueError(
                f"تعذر الوصول إلى النموذج. تأكد أنه عام (public). الحالة: {e.response.status_code}"
            ) from e
        except httpx.RequestError as e:
            raise ConnectionError(
                f"فشل الاتصال بنموذج Google: {str(e)}"
            ) from e

    html = response.text

    # Extract the form data structure
    fb_data = _extract_fb_public_load_data(html)
    if not fb_data:
        raise ValueError(
            "تعذر استخراج بيانات النموذج. تأكد أن الرابط صحيح والنموذج عام."
        )

    # Extract form title and description
    title = ""
    description = ""
    try:
        if fb_data[1] and len(fb_data[1]) > 8:
            title = fb_data[1][8] or ""
        if fb_data[1] and len(fb_data[1]) > 0:
            description = fb_data[1][0] or ""
    except (IndexError, TypeError):
        pass

    # Parse questions
    questions = _parse_questions(fb_data)

    return FormData(
        title=title or "نموذج بدون عنوان",
        description=description,
        questions=questions,
        form_url=normalized_url,
    )
