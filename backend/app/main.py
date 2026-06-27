from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes.advisor import router as advisor_router
from app.routes.auth import router as auth_router
from app.routes.consent import router as consent_router
from app.routes.dashboard import router as dashboard_router
from app.routes.score import router as score_router
from app.routes.identity import router as identity_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="AltGrade — Alternate Credit Scoring",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(score_router)
app.include_router(consent_router)
app.include_router(auth_router)
app.include_router(advisor_router)
app.include_router(identity_router)

app.include_router(dashboard_router)



@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
