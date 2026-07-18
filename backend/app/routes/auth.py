from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google")
async def google_auth(user_id: str):
    raise HTTPException(status_code=400, detail="Google authentication is disabled.")


@router.get("/google/callback")
async def google_callback(code: str, state: str):
    raise HTTPException(status_code=400, detail="Google authentication is disabled.")
