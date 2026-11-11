"""
Скрипт для завантаження документів із PeopleForce через API.
Запускати вручну або в cron для оновлення бази знань.

Документація PeopleForce API: https://developer.peopleforce.io
"""

import os
import json
import logging
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PEOPLEFORCE_API_KEY = os.getenv("PEOPLEFORCE_API_KEY", "")
PEOPLEFORCE_BASE_URL = "https://api.peopleforce.io/v1"
DOCS_DIR = Path(os.getenv("DOCS_DIR", "docs"))


def get_headers():
    return {
        "Authorization": f"Bearer {PEOPLEFORCE_API_KEY}",
        "Content-Type": "application/json",
    }


def fetch_documents():
    """Завантажує всі документи/політики з PeopleForce."""
    url = f"{PEOPLEFORCE_BASE_URL}/documents"
    response = requests.get(url, headers=get_headers())
    response.raise_for_status()
    return response.json()


def fetch_company_policies():
    """Завантажує корпоративні політики."""
    url = f"{PEOPLEFORCE_BASE_URL}/company/policies"
    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.warning(f"Не вдалося отримати policies: {e}")
        return []


def save_as_text(data: list[dict], output_dir: Path, prefix: str = "policy"):
    """Зберігає дані як текстові файли для RAG."""
    output_dir.mkdir(parents=True, exist_ok=True)
    saved = 0
    for item in data:
        # Отримуємо назву та контент (структура залежить від вашого PeopleForce)
        title = item.get("title") or item.get("name") or f"{prefix}_{item.get('id', 'unknown')}"
        content = item.get("content") or item.get("body") or item.get("description") or ""

        if not content:
            logger.warning(f"Порожній контент для: {title}")
            continue

        # Безпечна назва файлу
        safe_name = "".join(c if c.isalnum() or c in " _-" else "_" for c in title)
        filepath = output_dir / f"{prefix}_{safe_name[:60]}.txt"

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# {title}\n\n{content}")

        logger.info(f"Збережено: {filepath.name}")
        saved += 1

    return saved


def main():
    if not PEOPLEFORCE_API_KEY:
        logger.error(
            "PEOPLEFORCE_API_KEY не встановлено у .env!\n"
            "Поки що — покладіть документи вручну у папку docs/ (PDF, DOCX, TXT)."
        )
        return

    logger.info("Підключаємось до PeopleForce API...")

    # Документи
    try:
        docs = fetch_documents()
        n = save_as_text(docs.get("data", docs) if isinstance(docs, dict) else docs,
                         DOCS_DIR / "peopleforce", prefix="doc")
        logger.info(f"Документи: збережено {n}")
    except Exception as e:
        logger.error(f"Помилка при завантаженні документів: {e}")

    # Політики
    try:
        policies = fetch_company_policies()
        items = policies.get("data", policies) if isinstance(policies, dict) else policies
        n = save_as_text(items, DOCS_DIR / "peopleforce", prefix="policy")
        logger.info(f"Політики: збережено {n}")
    except Exception as e:
        logger.error(f"Помилка при завантаженні політик: {e}")

    logger.info(
        f"\n✅ Готово! Файли збережено у {DOCS_DIR}/peopleforce/\n"
        f"Тепер запустіть /reload у боті або перезапустіть його."
    )


if __name__ == "__main__":
    main()
