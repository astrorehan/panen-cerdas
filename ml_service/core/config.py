"""ML service configuration - env vars + constants."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = DATA_DIR / "models"


class Settings:
    project_name: str = "PanenCerdas"
    api_version: str = "0.1.0"

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ]

    ee_project_id: str | None = os.getenv("EE_PROJECT_ID")
    data_dir: Path = DATA_DIR
    model_dir: Path = MODEL_DIR


settings = Settings()
