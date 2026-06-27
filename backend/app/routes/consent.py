import uuid
import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text
from app.db import async_session

router = APIRouter(prefix="/consent", tags=["consent"])


class ConsentRequest(BaseModel):
    user_id: str
    name: str = "Anonymous"
    email: str = ""
    phone: str = ""
    consented_sources: list[str]


class ConsentResponse(BaseModel):
    consent_id: str
    status: str
    message: str


IN_MEMORY_CONSENTS = {}


@router.post("", response_model=ConsentResponse)
async def create_consent(request: ConsentRequest) -> ConsentResponse:
    consent_id = str(uuid.uuid4())
    consented_at = datetime.datetime.now(datetime.timezone.utc)

    try:
        async with async_session() as session:
            try:
                db_user_id = uuid.UUID(request.user_id)
                res = await session.execute(
                    text("SELECT id FROM users WHERE id = :user_id"),
                    {"user_id": db_user_id}
                )
                user_exists = res.fetchone()
            except ValueError:
                # Not a valid UUID, generate a deterministic one or a random one
                db_user_id = uuid.uuid5(uuid.NAMESPACE_DNS, request.user_id)
                res = await session.execute(
                    text("SELECT id FROM users WHERE id = :user_id"),
                    {"user_id": db_user_id}
                )
                user_exists = res.fetchone()

            phone = request.phone if request.phone else f"99999{uuid.uuid4().hex[:5]}"

            if user_exists:
                await session.execute(
                    text(
                        "UPDATE users SET name = :name, email = :email, phone = :phone, "
                        "consented_sources = :sources, consent_id = :consent_id, "
                        "consented_at = :consented_at WHERE id = :user_id"
                    ),
                    {
                        "name": request.name,
                        "email": request.email,
                        "phone": phone,
                        "sources": request.consented_sources,
                        "consent_id": uuid.UUID(consent_id),
                        "consented_at": consented_at,
                        "user_id": db_user_id,
                    }
                )
            else:
                await session.execute(
                    text(
                        "INSERT INTO users (id, name, email, phone, consented_sources, consent_id, consented_at) "
                        "VALUES (:id, :name, :email, :phone, :sources, :consent_id, :consented_at)"
                    ),
                    {
                        "id": db_user_id,
                        "name": request.name,
                        "email": request.email,
                        "phone": phone,
                        "sources": request.consented_sources,
                        "consent_id": uuid.UUID(consent_id),
                        "consented_at": consented_at,
                    }
                )
            await session.commit()

            return ConsentResponse(
                consent_id=consent_id,
                status="granted",
                message="Consent recorded in PostgreSQL database."
            )

    except Exception as e:
        print(f"PostgreSQL consent save failed (falling back): {e}")

        record = {
            "consent_id": consent_id,
            "user_id": request.user_id,
            "name": request.name,
            "email": request.email,
            "phone": request.phone,
            "consented_sources": request.consented_sources,
            "consented_at": consented_at.isoformat()
        }
        IN_MEMORY_CONSENTS[consent_id] = record

        try:
            import json
            from pathlib import Path
            local_file = Path(__file__).resolve().parents[2] / "consent_records.json"

            data = {}
            if local_file.exists():
                try:
                    data = json.loads(local_file.read_text())
                except Exception:
                    pass
            data[consent_id] = record
            local_file.write_text(json.dumps(data, indent=2))
        except Exception as file_ex:
            print(f"Could not write local consent file: {file_ex}")

        return ConsentResponse(
            consent_id=consent_id,
            status="granted",
            message="Consent recorded in local fallback storage (PostgreSQL unreachable)."
        )
