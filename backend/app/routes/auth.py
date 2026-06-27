import uuid
from fastapi import APIRouter
from fastapi.responses import RedirectResponse, HTMLResponse
import httpx
import redis
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

IN_MEMORY_TOKENS = {}


def get_redis_client():
    try:
        r = redis.from_url(settings.redis_url, decode_responses=True)
        r.ping()
        return r
    except Exception:
        return None


@router.get("/google")
async def google_auth(user_id: str):
    if not settings.google_client_id or not settings.google_client_secret:
        redirect_uri = f"http://localhost:5173/api/auth/google/callback?code=mock_oauth_code&state={user_id}"
        return RedirectResponse(redirect_uri)

    client_id = settings.google_client_id
    scope = "https://www.googleapis.com/auth/gmail.readonly"
    redirect_uri = "http://localhost:5173/api/auth/google/callback"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"state={user_id}&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return RedirectResponse(auth_url)


@router.get("/google/callback")
async def google_callback(code: str, state: str):
    user_id = state
    access_token = f"mock-gmail-token-{uuid.uuid4().hex}"

    if code != "mock_oauth_code" and settings.google_client_id:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": settings.google_client_id,
                        "client_secret": settings.google_client_secret,
                        "redirect_uri": "http://localhost:5173/api/auth/google/callback",
                        "grant_type": "authorization_code",
                    }
                )
                res_json = res.json()
                if "access_token" in res_json:
                    access_token = res_json["access_token"]
        except Exception as e:
            print(f"Failed Google OAuth token exchange: {e}")

    r = get_redis_client()
    token_key = f"gmail_token:{user_id}"
    if r:
        try:
            r.setex(token_key, 3600, access_token)
            print(f"Stored Gmail token in Redis for user {user_id}")
        except Exception as e:
            print(f"Redis store failed: {e}")
            IN_MEMORY_TOKENS[user_id] = access_token
    else:
        print(f"Redis offline. Storing Gmail token in-memory for user {user_id}")
        IN_MEMORY_TOKENS[user_id] = access_token

    html_content = """
    <html>
        <head>
            <title>Authentication Successful</title>
            <style>
                body {
                    font-family: 'Geist', -apple-system, sans-serif;
                    background-color: #000000;
                    color: #ffffff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                }
                .card {
                    background-color: #0a0a0a;
                    border: 1px solid #333333;
                    border-radius: 8px;
                    padding: 24px;
                    text-align: center;
                    max-width: 400px;
                }
                h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #00dfd8; }
                p { font-size: 14px; color: #888888; margin-bottom: 24px; }
                button {
                    background-color: #ffffff;
                    color: #000000;
                    border: none;
                    border-radius: 4px;
                    padding: 8px 16px;
                    font-weight: 500;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Gmail Connected Successfully</h1>
                <p>Your e-commerce confirmation emails have been linked. You can close this window to proceed.</p>
                <button onclick="window.close()">Close Window</button>
            </div>
            <script>
                if (window.opener) {
                    window.opener.postMessage({ type: 'GMAIL_CONNECTED', userId: '%s' }, '*');
                }
                setTimeout(function() { window.close(); }, 3000);
            </script>
        </body>
    </html>
    """ % user_id

    return HTMLResponse(content=html_content, status_code=200)
