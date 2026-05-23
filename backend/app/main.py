"""
Ainex Qudrat Lab: V8 Cognitive Mirror Architecture.
Decoupled Test Engine + Background Psychometric Shadow Engine.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import mastery, test_engine

app = FastAPI(
    title="Ainex Qudrat Lab",
    version="8.0.0",
    description="Cognitive Mirror for Qudrat Exam Mastery",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test_engine.router)
app.include_router(mastery.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ainex-qudrat-lab", "version": "8.0.0"}
