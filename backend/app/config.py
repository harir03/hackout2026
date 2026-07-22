from pydantic_settings import BaseSettings


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

    model_config = {"env_prefix": "ICA_", "env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
