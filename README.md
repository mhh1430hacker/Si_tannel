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

This repository includes Vercel support for the frontend app.

**Frontend Deployment:**
1. Connect your repository to Vercel
2. Set the **Root Directory** to the project folder containing `vercel.json`
3. Configure environment variables in Vercel dashboard:
   - `DATABASE_URL`: PostgreSQL connection string (use Vercel Postgres or external database)
   - `NEXT_PUBLIC_API_URL`: Backend API URL (deploy your backend separately)
4. Deploy

**Backend Deployment:**
The backend (FastAPI + PostgreSQL) requires separate deployment:
- Option 1: Deploy to Vercel using Python runtime
- Option 2: Deploy to Railway, Render, or similar platform
- Option 3: Use Docker with a container hosting service

**Environment Variables:**
See `.env.example` for required environment variables.

**Note:** This project uses a monorepo structure. When deploying to Vercel, ensure you set the correct root directory in your Vercel project settings.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/ainex_qudrat` | PostgreSQL connection string |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |

## Adaptive Routing (Phase 1)

| Last Answer | Action |
|-------------|--------|
| Correct | Step UP difficulty (سهل → متوسط → صعب) |
| Incorrect | Step DOWN difficulty (صعب → متوسط → سهل) |
| No match | Fallback to متوسط |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List skill categories |
| GET | `/api/question/first?category=X` | Get first question (easy) |
| POST | `/api/answer/submit` | Submit answer, get next question |
| GET | `/api/session/{id}/summary` | Session results summary |
| GET | `/health` | Health check |

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI endpoints
│   │   ├── database.py          # SQLAlchemy connection
│   │   ├── models.py            # ORM models
│   │   └── analytics/
│   │       └── routing.py       # Deterministic adaptive routing
│   ├── schema.sql               # DDL for PostgreSQL
│   ├── seed_data.sql            # Test data (Arabic)
│   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── layout.tsx           # RTL Arabic layout
│   │   ├── page.tsx             # Category selection
│   │   └── test-lab/page.tsx    # Core test interface
│   ├── package.json
│   └── tailwind.config.ts
└── docker-compose.yml
```
