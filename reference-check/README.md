# Reference Check Tool

A browser tool that helps recruiters collect structured references from a candidate's former colleagues.

**Live demo:** https://sviatoslav43.github.io/reference-check/
*(the interface is in Ukrainian)*

## The problem

Reference checks usually happen over chaotic phone calls or long email threads. Answers are hard to compare between referees, and candidate data ends up scattered across chats.

## How it works

1. The recruiter fills in the candidate, recruiter and referee details, picks questions from a question bank (1–5 ratings and open questions) or adds their own.
2. The tool generates one personalised link for the referee.
3. The referee opens the link, answers in the browser and sends the result back via Telegram or downloads it as a PDF.

## Privacy by design

- No backend and no database: all form data travels only inside the link (URL hash), so candidate data never sits on a server.
- XSS protection (`textContent` instead of `innerHTML`), Telegram username validation, a payload size limit and a cap of 30 questions per type.

## Tech

HTML, CSS and vanilla JavaScript; jsPDF and html2canvas for PDF export with Cyrillic support; hosted on GitHub Pages.

## Files

| File | What it does |
|---|---|
| `index.html` | Both modes: recruiter and referee |
| `main.js` | All logic: building the questionnaire, generating the link, PDF export |
| `style.css` | Styles |
