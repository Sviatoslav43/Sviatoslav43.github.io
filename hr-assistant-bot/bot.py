"""
HR Telegram Bot — головний файл
Технології: aiogram 3, LangChain, ChromaDB, OpenAI
"""

import asyncio
import logging
import os
from datetime import datetime

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, BotCommand
from aiogram.fsm.storage.memory import MemoryStorage
from dotenv import load_dotenv

from rag import HRRagEngine
from analytics import log_interaction, send_monthly_report, start_scheduler

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Ініціалізація ──────────────────────────────────────────────────────────────
bot = Bot(token=os.getenv("TELEGRAM_BOT_TOKEN"))
dp = Dispatcher(storage=MemoryStorage())
rag = HRRagEngine()

# Мови інтерфейсу (бот відповідає мовою запитання автоматично через LLM)
WELCOME_MESSAGES = {
    "uk": (
        "👋 Привіт! Я HR-асистент компанії.\n\n"
        "Я можу відповісти на питання щодо:\n"
        "• 📋 Політик та процедур\n"
        "• 🏖️ Відпусток та лікарняних\n"
        "• 💰 Бенефітів та компенсацій\n"
        "• 📝 Онбордингу\n"
        "• І багато іншого!\n\n"
        "Просто напишіть своє запитання. Я підтримую 🇺🇦 🇬🇧 🇧🇷 🇮🇳 🇪🇸"
    ),
}

HELP_TEXT = (
    "ℹ️ *HR-асистент — допомога*\n\n"
    "Просто напишіть запитання своєю мовою, і я знайду відповідь у базі знань компанії.\n\n"
    "*Команди:*\n"
    "/start — вітання\n"
    "/help — ця довідка\n"
    "/reload — 🔄 перезавантажити базу знань (тільки для HR-адмінів)\n\n"
    "Якщо бот не знайшов відповіді — зверніться до HR-команди напряму."
)

# ── Хендлери ──────────────────────────────────────────────────────────────────
@dp.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer(WELCOME_MESSAGES["uk"], parse_mode=None)


@dp.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(HELP_TEXT, parse_mode="Markdown")


@dp.message(Command("reload"))
async def cmd_reload(message: Message):
    """Перезавантаження бази знань (тільки для адмінів)."""
    admin_ids = [int(i) for i in os.getenv("ADMIN_TELEGRAM_IDS", "").split(",") if i]
    if message.from_user.id not in admin_ids:
        await message.answer("⛔ У вас немає доступу до цієї команди.")
        return

    await message.answer("⏳ Перезавантажую базу знань...")
    try:
        rag.reload()
        await message.answer("✅ Базу знань оновлено!")
    except Exception as e:
        logger.error(f"Reload error: {e}")
        await message.answer(f"❌ Помилка: {e}")


@dp.message(F.text)
async def handle_question(message: Message):
    """Головний обробник — відповідає на запитання через RAG."""
    user_id = message.from_user.id
    username = message.from_user.username or str(user_id)
    question = message.text.strip()

    # Показуємо "друкує..."
    await bot.send_chat_action(message.chat.id, "typing")

    try:
        result = await rag.answer(question)
        response_text = result["answer"]
        sources = result.get("sources", [])

        # Додаємо джерела якщо є
        if sources:
            sources_str = "\n".join(f"• {s}" for s in sources[:3])
            response_text += f"\n\n📎 *Джерела:*\n{sources_str}"

        await message.answer(response_text, parse_mode="Markdown")

        # Логуємо для аналітики
        await log_interaction(
            user_id=user_id,
            username=username,
            question=question,
            answer=result["answer"],
            found=result.get("found", True),
        )

    except Exception as e:
        logger.error(f"Error answering question from {user_id}: {e}")
        await message.answer(
            "😔 Виникла помилка при обробці вашого запиту. "
            "Будь ласка, спробуйте ще раз або зверніться до HR-команди."
        )


# ── Запуск ────────────────────────────────────────────────────────────────────
async def set_commands():
    await bot.set_my_commands([
        BotCommand(command="start", description="Почати роботу з ботом"),
        BotCommand(command="help", description="Довідка"),
        BotCommand(command="reload", description="Оновити базу знань (адміни)"),
    ])


async def main():
    logger.info("Starting HR bot...")

    # Завантажуємо базу знань при старті
    await asyncio.to_thread(rag.load)
    logger.info("Knowledge base loaded.")

    # Встановлюємо команди в меню
    await set_commands()

    # Запускаємо планувальник аналітики
    start_scheduler()

    # Запускаємо бота
    await dp.start_polling(bot, skip_updates=True)


if __name__ == "__main__":
    asyncio.run(main())
