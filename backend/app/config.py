from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load .env file from project root or backend directory
env_path = Path(__file__).resolve().parents[1] / ".env"
if not env_path.exists():
    env_path = Path(__file__).resolve().parents[2] / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ica:ica_dev@localhost:5432/ica"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = ["http://localhost:5173"]
    debug: bool = True
    gemini_api_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    sandbox_api_key: str = ""
    sandbox_secret: str = ""
    vapi_api_key: str = ""
    vapi_phone_number_id: str = ""
    vapi_assistant_id: str = ""
    default_target_phone: str = ""

    model_config = {"env_prefix": "ICA_", "env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
