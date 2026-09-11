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
    import json
    consent_id = str(uuid.uuid4())
    consented_at = datetime.datetime.now(datetime.timezone.utc)

    try:
        async with async_session() as session:
            try:
                db_user_id = uuid.UUID(request.user_id)
            except ValueError:
                db_user_id = uuid.uuid5(uuid.NAMESPACE_DNS, request.user_id)

            res = await session.execute(
                text("SELECT id FROM applicants WHERE id = :user_id"),
                {"user_id": str(db_user_id)}
            )
            applicant_exists = res.fetchone()

            phone = request.phone if request.phone else f"99999{uuid.uuid4().hex[:5]}"

            if applicant_exists:
                await session.execute(
                    text(
                        "UPDATE applicants SET name = :name, phone = :phone "
                        "WHERE id = :user_id"
                    ),
                    {
                        "name": request.name,
                        "phone": phone,
                        "user_id": str(db_user_id),
                    }
                )
            else:
                await session.execute(
                    text(
                        "INSERT INTO applicants (id, name, phone, created_at) "
                        "VALUES (:id, :name, :phone, :created_at)"
                    ),
                    {
                        "id": str(db_user_id),
                        "name": request.name,
                        "phone": phone,
                        "created_at": consented_at,
                    }
                )

            await session.execute(
                text(
                    "INSERT INTO consent (id, user_id, consented_sources, granted_at, is_active) "
                    "VALUES (:id, :user_id, :sources, :granted_at, :is_active)"
                ),
                {
                    "id": consent_id,
                    "user_id": str(db_user_id),
                    "sources": json.dumps(request.consented_sources),
                    "granted_at": consented_at,
                    "is_active": True,
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
