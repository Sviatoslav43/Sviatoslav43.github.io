# 🤖 HR Telegram Bot

Telegram-бот для автоматизації HR-рутини на базі RAG (Retrieval-Augmented Generation).
Підтримує 🇺🇦 🇬🇧 🇧🇷 🇮🇳 🇪🇸 мови та щомісячну аналітику на email.

## Стек технологій

| Компонент | Технологія |
|-----------|-----------|
| Telegram Bot | aiogram 3 |
| LLM | OpenAI GPT-4o |
| Векторна БД | ChromaDB (локально) |
| RAG-фреймворк | LangChain |
| Аналітика | APScheduler + SMTP |
| Хостинг | Railway / VPS |

---

## Швидкий старт

### 1. Клонуємо та встановлюємо залежності

```bash
git clone <your-repo>
cd hr_bot
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Налаштовуємо змінні середовища

```bash
cp .env.example .env
# Відкрийте .env і заповніть всі значення
```

Потрібні ключі:
- `TELEGRAM_BOT_TOKEN` — від [@BotFather](https://t.me/BotFather)
- `OPENAI_API_KEY` — від [platform.openai.com](https://platform.openai.com/api-keys)
- `REPORT_EMAIL`, `SMTP_USER`, `SMTP_PASSWORD` — для email-звітів

### 3. Додаємо документи

**Варіант А — вручну:**
Покладіть файли у папку `docs/`:
```
docs/
  vacation_policy.pdf
  onboarding_guide.docx
  faq.txt
  benefits.pdf
```

**Варіант Б — із PeopleForce:**
```bash
# Додайте PEOPLEFORCE_API_KEY у .env
python sync_peopleforce.py
```

### 4. Запускаємо бота

```bash
python bot.py
```

При першому запуску автоматично будується векторна база знань (може зайняти 1-2 хв).

---

## Деплой на Railway

1. Зареєструйтесь на [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Додайте змінні середовища у Settings → Variables
4. Railway автоматично запустить `python bot.py`

Або через CLI:
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## Оновлення бази знань

Після додавання нових документів у `docs/` надішліть команду `/reload` у Telegram
(доступно тільки для адмінів із `ADMIN_TELEGRAM_IDS`).

---

## Структура проєкту

```
hr_bot/
├── bot.py               # Головний файл бота
├── rag.py               # RAG-рушій (LangChain + ChromaDB)
├── analytics.py         # Логування та email-звіти
├── sync_peopleforce.py  # Синхронізація з PeopleForce API
├── requirements.txt
├── .env.example
├── docs/                # ← Ваші HR-документи тут
└── chroma_db/           # Векторна БД (генерується автоматично)
```

---

## Щомісячний email-звіт

Автоматично надсилається 1-го числа кожного місяця о 09:00 (Kyiv).
Містить:
- Загальна кількість запитів та унікальних користувачів
- Відсоток успішності відповідей
- Топ-20 найпопулярніших запитань
- Запитання, на які бот не знайшов відповіді (сигнал для поповнення бази)
- Топ-10 найактивніших користувачів

Налаштування у `.env`: `REPORT_DAY`, `REPORT_HOUR`, `REPORT_EMAIL`.

---

## Підтримувані формати документів

| Формат | Розширення |
|--------|-----------|
| PDF | `.pdf` |
| Word | `.docx`, `.doc` |
| Текст | `.txt`, `.md` |
| HTML | `.html`, `.htm` |

---

## FAQ

**Бот відповідає неправильно?**
→ Перевірте якість документів. Додайте більше деталей у відповідний документ і виконайте `/reload`.

**Як змінити стиль спілкування бота?**
→ Відредагуйте `HR_PROMPT` у `rag.py`.

**Як додати нову мову?**
→ Нічого не потрібно — GPT-4o автоматично відповідає мовою запитання.
