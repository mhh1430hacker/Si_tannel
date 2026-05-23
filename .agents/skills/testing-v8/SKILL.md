---
name: testing-ainex-v8
description: End-to-end testing procedure for Ainex Qudrat Lab V8 Cognitive Mirror architecture. Use when verifying adaptive routing, NudgeLimiter, Shadow Engine, or MasteryConstellation changes.
---

# Testing Ainex Qudrat Lab V8

## Prerequisites

- Docker and Docker Compose installed
- Ports 5432, 8000, 3000 available

## Stack Setup

```bash
cd /home/ubuntu/repos/Si_tannel

# Kill any stale processes on needed ports
sudo lsof -ti:5432,8000,3000 | xargs -r kill -9 2>/dev/null

# Start the full stack
docker compose up -d --build

# Wait for health
curl --retry 10 --retry-delay 2 -s http://localhost:8000/health
curl --retry 10 --retry-delay 2 -s http://localhost:3000
```

## Test 1: Submit Endpoint Performance (<100ms)

```bash
# Get first question
curl -s "http://localhost:8000/api/question/first?category=%D8%A7%D9%84%D8%AC%D8%A8%D8%B1"

# Measure submit response time (should be <100ms, typically ~7ms)
USER_ID=$(python3 -c "import uuid; print(uuid.uuid4())")
SESSION_ID=$(python3 -c "import uuid; print(uuid.uuid4())")
curl -s -w "\nTime: %{time_total}s\n" -X POST http://localhost:8000/api/answer/submit \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"session_id\":\"$SESSION_ID\",\"question_id\":2,\"chosen_choice_id\":5,\"time_taken_seconds\":15}"
```

## Test 2: Adaptive Routing

Verify difficulty progression in the UI:
1. Navigate to http://localhost:3000
2. Select "الجبر" category
3. Answer correctly → difficulty should step UP (سهل → متوسط → صعب)
4. Answer incorrectly → difficulty should step DOWN

The difficulty label is shown in the subtitle (e.g., "سهل • الجبر").

## Test 3: Shadow Engine Telemetry

```bash
# After submitting answers, check telemetry was computed in background
docker exec si_tannel-db-1 psql -U postgres -d ainex_qudrat \
  -c "SELECT id, response_velocity, time_deviation_from_expected, streak_count FROM answer_telemetry;"
```

## Test 4: Mastery Constellation

```bash
# Get mastery data for a user who has answered questions
curl -s "http://localhost:8000/api/mastery/$USER_ID" | python3 -m json.tool
```

Then verify the frontend renders at:
`http://localhost:3000/mastery-map?user_id=<uuid>`

Expected: Dark bg-neutral-950 background, SVG with nodes (opacity 0.4 unmastered, 0.9 mastered), stats cards.

## Test 5: NudgeLimiter Enforcement

```bash
# Insert 2 nudges for a test session
docker exec si_tannel-db-1 psql -U postgres -d ainex_qudrat -c "
INSERT INTO session_nudges (session_id, user_id, nudge_text, nudge_type) VALUES 
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Test nudge 1', 'observational'),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Test nudge 2', 'observational');"

# Then verify programmatically that 3rd nudge is blocked
cd backend && source .venv/bin/activate
python3 -c "
import uuid
from app.database import SessionLocal
from app.middleware.nudge_limiter import can_deliver_nudge
db = SessionLocal()
result = can_deliver_nudge(db, uuid.UUID('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'))
print(f'Can deliver 3rd: {result}')  # Should be False
db.close()
"
```

## Key Notes

- The NudgeLimiter requires extreme velocity patterns to trigger naturally (fast incorrect answers). For testing enforcement, insert nudges directly into the DB.
- MasteryConstellation only updates on session completion — it will NOT change mid-session. This is by design.
- The frontend uses `useSearchParams()` which requires Suspense boundaries in Next.js 14.
- Database credentials: postgresql://postgres:postgres@localhost:5432/ainex_qudrat
- Seed data includes 15 questions across الجبر, الهندسة, استيعاب المقروء at all difficulty levels.

## Devin Secrets Needed

None — all credentials are local development defaults (postgres/postgres).
