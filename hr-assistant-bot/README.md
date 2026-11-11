# AI HR Assistant (Telegram bot)

A Telegram bot that answers employees' HR questions from the company's own documents. Working prototype.

**Demo:** https://sviatoslav43.github.io/hr-assistant-bot/demo/ (a simulated chat with sample policies; the personal leave balance question shows a planned feature, not part of the prototype)

*[Українська версія README](README.uk.md)*

## The problem

HR gets the same questions again and again: how many vacation days are left, how to take sick leave, what benefits exist, what to do in the first week. The answers already live in policy documents, but people don't read them.

## What the bot does

- Answers questions on policies, leave, benefits and onboarding **only from company documents**, and links to the source document. If the answer isn't there, it says so and refers the person to HR instead of making something up.
- Replies in the language of the question: Ukrainian, English, Portuguese, Hindi or Spanish, for teams in Ukraine, LATAM and India.
- Sends HR a monthly email report: total and unique users, answer success rate, top 20 questions, and **questions the bot couldn't answer**, which show where the knowledge base has gaps.
- Lets HR admins reload the knowledge base with `/reload` after adding new documents.
- Can sync documents from PeopleForce (HRIS) through its API.

## How it works

The bot uses RAG (retrieval-augmented generation): documents are split into chunks and stored in a vector database; for each question the bot finds the most relevant chunks and asks the language model to answer using only them.

| Part | Technology |
|---|---|
| Telegram bot | aiogram 3 |
| Language model | OpenAI GPT-4o |
| Vector database | ChromaDB |
| RAG framework | LangChain |
| Monthly report | APScheduler + SMTP |

## Run it locally

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add your Telegram token and OpenAI key
mkdir docs                  # put PDF, DOCX, TXT or HTML policies here
python bot.py
```

## Files

| File | What it does |
|---|---|
| `bot.py` | Telegram handlers and startup |
| `rag.py` | Loads documents, builds the vector index, answers questions |
| `analytics.py` | Logs questions and sends the monthly report |
| `sync_peopleforce.py` | Downloads documents from PeopleForce |
