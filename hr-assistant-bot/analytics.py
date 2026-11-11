"""
Аналітика: логування взаємодій та щомісячний email-звіт.
"""

import json
import logging
import os
import smtplib
from collections import Counter
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

ANALYTICS_FILE = Path(os.getenv("ANALYTICS_FILE", "analytics.jsonl"))
REPORT_EMAIL = os.getenv("REPORT_EMAIL", "")          # куди надсилати звіт
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
REPORT_DAY = int(os.getenv("REPORT_DAY", "1"))        # 1-ше число місяця
REPORT_HOUR = int(os.getenv("REPORT_HOUR", "9"))       # 09:00


# ── Логування ─────────────────────────────────────────────────────────────────

async def log_interaction(
    user_id: int,
    username: str,
    question: str,
    answer: str,
    found: bool,
):
    """Записує кожну взаємодію у JSONL-файл."""
    entry = {
        "ts": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "username": username,
        "question": question,
        "answer": answer,
        "found": found,
    }
    try:
        with open(ANALYTICS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as e:
        logger.error(f"Помилка логування: {e}")


def load_interactions(since: datetime | None = None) -> list[dict]:
    """Читає всі взаємодії (або з певної дати)."""
    if not ANALYTICS_FILE.exists():
        return []
    entries = []
    with open(ANALYTICS_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                if since:
                    ts = datetime.fromisoformat(entry["ts"])
                    if ts < since:
                        continue
                entries.append(entry)
            except Exception:
                pass
    return entries


# ── Звіт ──────────────────────────────────────────────────────────────────────

def build_report(entries: list[dict]) -> str:
    """Будує HTML-звіт по взаємодіях."""
    total = len(entries)
    found = sum(1 for e in entries if e.get("found", True))
    not_found = total - found
    unique_users = len({e["user_id"] for e in entries})

    # Топ-20 запитань
    questions = [e["question"] for e in entries]
    top_questions = Counter(questions).most_common(20)

    # Топ користувачів
    users = [e.get("username", str(e["user_id"])) for e in entries]
    top_users = Counter(users).most_common(10)

    # Запитання без відповіді
    unanswered = [e["question"] for e in entries if not e.get("found", True)]
    top_unanswered = Counter(unanswered).most_common(10)

    now = datetime.utcnow()
    period_start = (now - timedelta(days=31)).strftime("%d.%m.%Y")
    period_end = now.strftime("%d.%m.%Y")

    rows_top_q = "".join(
        f"<tr><td>{i+1}</td><td>{q}</td><td>{c}</td></tr>"
        for i, (q, c) in enumerate(top_questions)
    )
    rows_unanswered = "".join(
        f"<tr><td>{i+1}</td><td>{q}</td><td>{c}</td></tr>"
        for i, (q, c) in enumerate(top_unanswered)
    ) or "<tr><td colspan='3'>Всі запити отримали відповідь 🎉</td></tr>"
    rows_users = "".join(
        f"<tr><td>{i+1}</td><td>@{u}</td><td>{c}</td></tr>"
        for i, (u, c) in enumerate(top_users)
    )

    return f"""
<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8">
<style>
  body {{ font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }}
  h1 {{ color: #1a73e8; }} h2 {{ color: #444; border-bottom: 2px solid #e0e0e0; padding-bottom: 6px; }}
  .stat-grid {{ display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }}
  .stat {{ background: #f5f5f5; border-radius: 8px; padding: 16px 24px; min-width: 140px; text-align: center; }}
  .stat .num {{ font-size: 2em; font-weight: bold; color: #1a73e8; }}
  .stat .label {{ font-size: 0.85em; color: #777; }}
  table {{ width: 100%; border-collapse: collapse; margin: 12px 0; }}
  th {{ background: #1a73e8; color: white; padding: 8px 12px; text-align: left; }}
  td {{ padding: 7px 12px; border-bottom: 1px solid #eee; }}
  tr:nth-child(even) {{ background: #f9f9f9; }}
  .footer {{ margin-top: 30px; font-size: 0.8em; color: #999; }}
</style></head><body>
<h1>📊 HR-бот: Щомісячний звіт</h1>
<p>Період: <strong>{period_start} — {period_end}</strong></p>

<div class="stat-grid">
  <div class="stat"><div class="num">{total}</div><div class="label">Всього запитів</div></div>
  <div class="stat"><div class="num">{unique_users}</div><div class="label">Унікальних користувачів</div></div>
  <div class="stat"><div class="num">{found}</div><div class="label">З відповіддю ✅</div></div>
  <div class="stat"><div class="num">{not_found}</div><div class="label">Без відповіді ❌</div></div>
  <div class="stat"><div class="num">{round(found/total*100) if total else 0}%</div><div class="label">Успішність</div></div>
</div>

<h2>🔥 Топ-20 запитань</h2>
<table><thead><tr><th>#</th><th>Запитання</th><th>Кількість</th></tr></thead>
<tbody>{rows_top_q}</tbody></table>

<h2>❓ Запитання без відповіді (додайте до бази знань!)</h2>
<table><thead><tr><th>#</th><th>Запитання</th><th>Кількість</th></tr></thead>
<tbody>{rows_unanswered}</tbody></table>

<h2>👤 Найактивніші користувачі</h2>
<table><thead><tr><th>#</th><th>Username</th><th>Запитів</th></tr></thead>
<tbody>{rows_users}</tbody></table>

<div class="footer">Звіт згенеровано автоматично HR-ботом • {now.strftime("%d.%m.%Y %H:%M")} UTC</div>
</body></html>
"""


def send_email_report(html: str):
    """Надсилає HTML-звіт на email."""
    if not REPORT_EMAIL or not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("Email не налаштовано — пропускаємо надсилання звіту.")
        return

    now = datetime.utcnow()
    subject = f"HR-бот: звіт за {now.strftime('%B %Y')}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = REPORT_EMAIL
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, REPORT_EMAIL.split(","), msg.as_string())
        logger.info(f"Звіт надіслано на {REPORT_EMAIL}")
    except Exception as e:
        logger.error(f"Помилка надсилання звіту: {e}")


async def generate_and_send_report():
    """Генерує та надсилає звіт за останній місяць."""
    since = datetime.utcnow() - timedelta(days=31)
    entries = load_interactions(since=since)
    logger.info(f"Генерую звіт: {len(entries)} взаємодій за останній місяць")
    html = build_report(entries)
    send_email_report(html)


# ── Планувальник ──────────────────────────────────────────────────────────────

_scheduler: AsyncIOScheduler | None = None


def start_scheduler():
    """Запускає APScheduler — надсилає звіт 1-го числа кожного місяця."""
    global _scheduler
    _scheduler = AsyncIOScheduler(timezone="Europe/Kyiv")
    _scheduler.add_job(
        generate_and_send_report,
        trigger=CronTrigger(day=REPORT_DAY, hour=REPORT_HOUR, minute=0),
        id="monthly_report",
        replace_existing=True,
        name="HR Monthly Report",
    )
    _scheduler.start()
    logger.info(
        f"Планувальник запущено: звіт надсилається {REPORT_DAY}-го числа о {REPORT_HOUR}:00 (Kyiv)"
    )
