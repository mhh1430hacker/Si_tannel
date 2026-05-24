# Ainex Qudrat Lab (معمل قدرات)

Adaptive testing platform for Qudrat exam preparation. Phase 1 MVP implements deterministic rule-based difficulty routing.

## Architecture

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: Next.js 14 + Tailwind CSS (Arabic RTL)
- **Routing Algorithm**: Deterministic step-up/step-down based on answer correctness

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Set up database
createdb ainex_qudrat
psql -d ainex_qudrat -f schema.sql
psql -d ainex_qudrat -f seed_data.sql

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 to start the test lab.

### Deploying to Vercel

The entire app (frontend + API routes) deploys as a single Vercel project. The root `vercel.json` uses `@vercel/next` builder pointing to `frontend/package.json`, so **no Root Directory change is needed** in Vercel project settings.

**Steps:**
1. Connect your repository to Vercel
2. Add a **Vercel Postgres** database: Project → Storage → Create Database → PostgreSQL
3. Deploy — Vercel will automatically build the Next.js app from `frontend/`
4. After first deploy, initialize the database schema: `curl -X POST https://your-domain.vercel.app/api/setup`
5. Import questions via the `/import` page (paste a public Google Form link)

**Environment Variables (auto-provided by Vercel Postgres):**
- `POSTGRES_URL` — injected automatically when Vercel Postgres is connected

**Local Development:**
See `.env.example` for local environment variables. The `backend/` directory with FastAPI + Docker is available for local dev.

## Adaptive Routing (Phase 1)

| Last Answer | Action |
|-------------|--------|
| Correct | Step UP difficulty (سهل → متوسط → صعب) |
| Incorrect | Step DOWN difficulty (صعب → متوسط → سهل) |
| No match | Fallback to متوسط |

## API Endpoints (Serverless)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List skill categories |
| GET | `/api/question/first?category=X` | Get first question (Easy→Medium→any fallback) |
| POST | `/api/answer/submit` | Submit answer + adaptive routing to next question |
| GET | `/api/session/{id}/summary` | Session results summary |
| GET | `/api/mastery/{userId}` | Mastery constellation graph data |
| POST | `/api/forms/preview` | Preview Google Form questions |
| POST | `/api/forms/import` | Import MCQ questions from Google Form |
| GET | `/api/forms/imports` | List all form imports |
| DELETE | `/api/forms/imports/{importId}` | Delete a form import |
| GET/POST | `/api/setup` | Initialize database schema |

## Project Structure

```
├── backend/                        # FastAPI (local dev with Docker)
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── analytics/
│   │       └── routing.py
│   ├── schema.sql
│   ├── seed_data.sql
│   └── requirements.txt
├── frontend/                       # Next.js (deployed to Vercel)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/               # Serverless API routes
│   │   │   ├── import/page.tsx    # Google Form importer
│   │   │   ├── mastery-map/page.tsx
│   │   │   ├── test-lab/page.tsx
│   │   │   └── page.tsx           # Category selection
│   │   └── lib/
│   │       ├── db.ts              # @vercel/postgres database layer
│   │       └── form-scraper.ts    # Google Form extraction
│   ├── package.json
│   └── tailwind.config.ts
├── vercel.json                     # Vercel build config
└── docker-compose.yml
```
