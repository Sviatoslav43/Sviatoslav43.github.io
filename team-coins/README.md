# Team Coins

A gamified rewards and recognition platform for a team. Working prototype, built on Google Apps Script with Google Sheets as the database.

**Live demo:** https://sviatoslav43.github.io/team-coins/demo/
*(sample data; you are signed in as an admin, so every page is open; changes reset when you reload)*

## The problem

Recognition at work happened now and then, in chats, and was quickly forgotten. Contributions outside someone's direct job (a talk at a meetup, an English club, a LinkedIn post about the company) went unnoticed.

## How it works

- **Kudos.** Everyone gets 3 Kudos a month to thank colleagues; each one gives the colleague 10 coins.
- **Claims.** Employees submit claims for contributions such as talks, skill sharing, articles or organising events. HR approves or rejects each one, because no script can check whether a screenshot is real.
- **Reward shop.** Coins are exchanged for merch, books, gift cards, learning subscriptions or an extra day off.
- **Achievements.** Granted automatically, for example for receiving Kudos 6 months in a row.
- **Secret Coin.** Managers can recognise someone quietly, within a quarterly budget.

### Fair-play rules

- Weekly and monthly caps per activity, plus a shared monthly cap for social media posts.
- One-time activities can't be claimed twice; a rejected claim can be resubmitted.
- Secret Coin can't go to the same person two quarters in a row, and the company-wide budget is 100 coins per quarter.
- Three roles: employee, manager (Secret Coin only) and admin; only accounts from the company domain can sign in.
- Text written into the sheet is protected from formula injection.

### For HR

An admin dashboard with participation, Kudos, claim approval rates and the most popular rewards, built to decide whether to roll out after a pilot. Rewards and temporary campaign activities are managed from the interface, without code changes.

## Files

| Path | What it is |
|---|---|
| `apps-script/Code.gs` | Backend: business rules, roles, achievements, statistics |
| `apps-script/Index.html` | Frontend: a single-page app in Ukrainian and English |
| `apps-script/appsscript.json` | Apps Script manifest |
| `demo/` | The live demo. It runs the **same unchanged `Code.gs`** in the browser: `gas-shim.js` replaces Google Sheets, sessions and email with in-memory versions, and `runner.js` replaces `google.script.run`. |

Code comments are in Ukrainian.

## Deploy your own copy

1. Create a Google Sheet and open **Extensions → Apps Script**.
2. Add `Code.gs` and an HTML file named `Index`, and paste in the code. In Project settings, show the manifest and replace it with `appsscript.json`.
3. In `Code.gs`, set `ALLOWED_DOMAIN`, `OWNER_EMAIL` and `CURRENCY_NAME`.
4. Run the `setup` function once to create the sheets.
5. **Deploy → New deployment → Web app**, execute as you, access for your domain.

To show real names, the account that deploys needs read access to the Workspace user directory; without it, names are built from email addresses.
