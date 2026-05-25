# Ainex Qudrat Lab (معمل قدرات)

Adaptive testing platform for Qudrat exam preparation with deterministic difficulty routing.

## Deploying to Vercel

The Next.js app lives at the **repository root** — Vercel auto-detects it.

**Steps:**
1. Connect your repository to Vercel
2. Leave **Root Directory** empty (default) — no changes needed
3. Add a **Vercel Postgres** database: Project → Storage → Create Database → PostgreSQL
4. Deploy — Vercel builds automatically
5. After first deploy, initialize the database: `curl -X POST https://your-domain.vercel.app/api/setup`
6. Import questions via the `/import` page (paste a public Google Form link)

## Local Development

### Frontend (Next.js)

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Backend (FastAPI + Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

createdb ainex_qudrat
psql -d ainex_qudrat -f schema.sql
psql -d ainex_qudrat -f seed_data.sql

uvicorn app.main:app --reload --port 8000
```

## Adaptive Routing

| Last Answer | Action |
|-------------|--------|
| Correct | Step UP difficulty (سهل → متوسط → صعب) |
| Incorrect | Step DOWN difficulty (صعب → متوسط → سهل) |
| No match | Fallback to متوسط |

## API Endpoints (Serverless)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List skill categories |
| GET | `/api/question/first?category=X` | Get first question |
| POST | `/api/answer/submit` | Submit answer + adaptive routing |
| GET | `/api/session/{id}/summary` | Session results summary |
| GET | `/api/mastery/{userId}` | Mastery constellation data |
| POST | `/api/forms/preview` | Preview Google Form questions |
| POST | `/api/forms/import` | Import questions from Google Form |
| GET | `/api/forms/imports` | List all form imports |
| GET/POST | `/api/setup` | Initialize database schema |

## Project Structure

```
├── src/app/                    # Next.js pages + API routes
│   ├── api/                    # Serverless API routes
│   ├── import/page.tsx         # Google Form importer
│   ├── mastery-map/page.tsx    # Mastery constellation
│   ├── test-lab/page.tsx       # Adaptive test engine
│   └── page.tsx                # Category selection
├── src/lib/
│   ├── db.ts                   # @vercel/postgres database layer
│   └── form-scraper.ts         # Google Form extraction
├── backend/                    # FastAPI (Docker local dev)
├── package.json
├── next.config.js
├── vercel.json
└── docker-compose.yml
```
