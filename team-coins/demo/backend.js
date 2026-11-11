/* GENERATED from ../apps-script/Code.gs — do not edit by hand. */
window.__backend = (function (SpreadsheetApp, Session, LockService, MailApp, Utilities, ScriptApp, AdminDirectory, HtmlService) {
/**
 * TEAM COINS — Apps Script backend
 * ---------------------------------------------
 * Гейміфікована платформа визнання й винагород для команди.
 *
 *  1. Kudos між колегами (3 на місяць, кожен дає отримувачу 10 коїнів).
 *  2. Категорії заробітку, що потребують "пруфу" (Story, LinkedIn,
 *     Skill Sharing, дайджест, виступи, організація активностей/подій),
 *     ІДУТЬ ЧЕРЕЗ ЧЕРГУ ЗАЯВОК (Submissions), а не нараховуються миттєво:
 *     жоден скрипт не може перевірити, чи скріншот справжній. Заявку
 *     подає співробітник, підтверджує адмін (HR).
 *  3. Ліміти по категоріях: 1x/тиждень (Story, LinkedIn), 1x/місяць
 *     (Skill Sharing), спільний ліміт для соцмереж 100 коїнів/міс.
 *  4. Адмін-панель прямо в застосунку: approve/reject заявок,
 *     керування адмінами й менеджерами, видача Secret Coin
 *     (з перевіркою "не тій самій людині 2 квартали підряд").
 *  5. OWNER_EMAIL — "bootstrap"-адмін, завжди має доступ незалежно
 *     від вмісту листа Admins (щоб не можна було випадково
 *     заблокувати самого себе).
 *
 * НАЛАШТУВАННЯ: змініть ALLOWED_DOMAIN, OWNER_EMAIL і CURRENCY_NAME нижче.
 */

const SHEET_BALANCES = 'Balances';
const SHEET_KUDOS = 'KudosLog';
const SHEET_ORDERS = 'Orders';
const SHEET_SUBMISSIONS = 'Submissions';
const SHEET_ADMINS = 'Admins';
const SHEET_SUGGESTIONS = 'Suggestions';
const SHEET_MANAGERS = 'Managers';
const SHEET_SECRET_COIN = 'SecretCoinLog';
const SHEET_REWARDS = 'Rewards';
const SHEET_CAMPAIGN_CATEGORIES = 'CampaignCategories';
const SHEET_ACHIEVEMENTS_LOG = 'AchievementsLog';

// ============ CONFIG ============
const ALLOWED_DOMAIN = 'yourcompany.com';      // лише акаунти цього домену мають доступ
const OWNER_EMAIL = 'hr@yourcompany.com';      // bootstrap-адмін, завжди має доступ

const CURRENCY_NAME = 'Team Coins';
const CURRENCY_EMOJI = '🪙';

// Банер-анонс угорі сторінки. Залиште порожнім рядком '', щоб сховати.
const ANNOUNCEMENT = '';

// Змінюйте цей рядок при кожному значному оновленні Code.gs —
// відображається на сторінці поруч з версією фронтенду, щоб можна
// було одним поглядом перевірити, чи обидва файли актуальні.
const BACKEND_VERSION = '2026-09-08 · v24';

// ============ REWARD SHOP ============
// Призи живуть у вкладці таблиці "Rewards", не в коді — адмін може
// додавати нові через інтерфейс платформи. Цей масив використовується
// ЛИШЕ ОДИН РАЗ, щоб "засіяти" вкладку початковими даними при першому
// запуску (ensureSheets_).
const REWARDS_SEED = [
  { id: 'mug',      name: 'Брендована чашка',             nameEn: 'Branded mug',                price: 150,  emoji: '☕', desc: 'Фірмова чашка компанії.', descEn: 'Official company mug.' },
  { id: 'book',     name: 'Книга на вибір (до $10)',       nameEn: 'Book of choice (up to $10)', price: 200,  emoji: '📚', desc: 'Будь-яка книга в межах бюджету.', descEn: 'Any book within budget.' },
  { id: 'cert20',   name: 'Сертифікат на вибір (до $20)',  nameEn: 'Gift card of choice ($20)',  price: 250,  emoji: '🎁', desc: 'Подарунковий сертифікат.', descEn: 'Gift certificate.' },
  { id: 'tshirt',   name: 'Футболка з мерчем',             nameEn: 'Company T-shirt',            price: 300,  emoji: '👕', desc: 'Фірмовий мерч.', descEn: 'Official merch.' },
  { id: 'dinner',   name: 'Вечеря / доставка (до $30)',    nameEn: 'Dinner / delivery ($30)',    price: 400,  emoji: '🍕', desc: 'На ваш смак.', descEn: 'Your choice.' },
  { id: 'donation', name: 'Донат $40 на благодійність',    nameEn: '$40 charity donation',       price: 500,  emoji: '💚', desc: 'Компанія робить донат у фонд з узгодженого списку на ваш вибір.', descEn: 'The company donates to a charity of your choice from the approved list.' },
  { id: 'cert50',   name: 'Сертифікат $50',                nameEn: '$50 gift card',              price: 600,  emoji: '🎁', desc: 'Подарунковий сертифікат.', descEn: 'Gift certificate.' },
  { id: 'learning', name: 'Підписка на навчання (до $60)', nameEn: 'Learning subscription ($60)',price: 700,  emoji: '🎓', desc: 'Курс, платформа для навчання на вибір.', descEn: 'Course or learning platform of choice.' },
  { id: 'cert100',  name: 'Сертифікат $100',               nameEn: '$100 gift card',             price: 1200, emoji: '💳', desc: 'Подарунковий сертифікат.', descEn: 'Gift certificate.' },
  { id: 'vacation', name: '+1 вихідний день',              nameEn: '+1 day off',                 price: 1500, emoji: '🌴', desc: 'Повний додатковий day off.', descEn: 'One full extra day off.' },
  { id: 'cert150',  name: 'Сертифікат $150',               nameEn: '$150 gift card',             price: 2000, emoji: '💎', desc: 'Подарунковий сертифікат.', descEn: 'Gift certificate.' },
  { id: 'ps5',      name: 'PlayStation 5',                 nameEn: 'PlayStation 5',              price: 4000, emoji: '🎮', desc: 'Головний приз.', descEn: 'Grand prize.', stock: 1 },
];

// ============ КАТЕГОРІЇ ЗАРОБІТКУ ЧЕРЕЗ ЗАЯВКУ (потребують "пруфу") ============
// group: категорії з однаковим group мають СПІЛЬНИЙ місячний ліміт (SOCIAL_GROUP_CAP_PER_MONTH)
const EARN_CATEGORIES = [
  { id: 'insta_story',      label: '📱 Story в Instagram зі згадкою компанії', labelEn: '📱 Instagram Story mentioning the company', coins: 10,  period: 'week',  periodCap: 1, group: 'social',
    proofHint: 'Підтвердіть, що сторі опубліковано (сторі на 24 год — просто опишіть).', proofHintEn: 'Confirm the story was published (stories last 24h — just describe it).' },
  { id: 'linkedin_post',    label: '💼 LinkedIn-пост зі згадкою компанії', labelEn: '💼 LinkedIn post mentioning the company', coins: 20, period: 'week', periodCap: 1, group: 'social',
    proofHint: 'Посилання на пост.', proofHintEn: 'Link to the post.' },
  { id: 'skill_sharing',    label: '🧠 Skill Sharing для компанії', labelEn: '🧠 Skill Sharing for the company', coins: 60, period: 'month', periodCap: 1,
    proofHint: 'Тема, попередньо узгоджена з HR.', proofHintEn: 'Topic pre-agreed with HR.' },
  { id: 'digest',           label: '📰 Стаття в дайджест', labelEn: '📰 Digest article', coins: 15,
    proofHint: 'Посилання або назва статті.', proofHintEn: 'Link or article title.' },
  { id: 'speaking',         label: '🎤 Виступ від компанії (meetup/webinar/podcast)', labelEn: '🎤 Speaking for the company (meetup/webinar/podcast)', coins: 100,
    proofHint: 'Посилання на запис/подію. Погоджено з лідом і HR заздалегідь.', proofHintEn: 'Link to the recording/event. Pre-agreed with your lead and HR.' },
  { id: 'organize_activity', label: '🎉 Організація внутрішньої активності/клубу', labelEn: '🎉 Organizing an internal activity/club', coins: 40,
    proofHint: 'Опис активності — мінімум 5 учасників.', proofHintEn: 'Describe the activity — minimum 5 participants.' },
  { id: 'event_help',       label: '🤝 Окрема роль в організації company event', labelEn: '🤝 A dedicated role in organizing a company event', coins: 30,
    proofHint: 'Яку роль виконали (не входить у звичайні обов\u2019язки, погоджено з HR).', proofHintEn: 'What role you took on (outside normal duties, agreed with HR).' },
  { id: 'english_club',    label: '🗣️ Провести English Speaking Club', labelEn: '🗣️ Run an English Speaking Club', coins: 40,
    proofHint: 'Опис заходу — коли, скільки учасників.', proofHintEn: 'Describe the session — when, how many participants.' },
  { id: 'sport_event',     label: '🏅 Представити компанію на спортивній події', labelEn: '🏅 Represent the company at a sports event', coins: 30,
    proofHint: 'Яка подія, коли, підтвердження участі.', proofHintEn: 'Which event, when, proof of participation.' },
  // Підзадачі ачівки "💼 LinkedIn Trainee" — звичайні категорії заробітку з
  // ФІКСОВАНИМ id (важливо для трекінгу ачівки). displayGroup — лише про
  // ВІДОБРАЖЕННЯ: фронтенд показує ці категорії у вкладці "Маркетинг" разом
  // зі звичайними кампанійними активностями.
  { id: 'li_trainee_profile', label: '💼 LinkedIn Trainee: оформити профіль', labelEn: '💼 LinkedIn Trainee: set up your profile', coins: 30, achievementId: 'linkedin_trainee',
    displayGroup: 'Маркетинг', displayGroupEn: 'Marketing', oneTimeOnly: true,
    proofHint: 'Посилання на ваш LinkedIn-профіль.', proofHintEn: 'Link to your LinkedIn profile.' },
  { id: 'li_trainee_recommendation', label: '💼 LinkedIn Trainee: написати рекомендацію', labelEn: '💼 LinkedIn Trainee: write a recommendation', coins: 30, achievementId: 'linkedin_trainee',
    displayGroup: 'Маркетинг', displayGroupEn: 'Marketing', oneTimeOnly: true,
    proofHint: 'Кому й посилання на рекомендацію.', proofHintEn: 'Who for, and a link to the recommendation.' },
  { id: 'li_trainee_first_post', label: '💼 LinkedIn Trainee: перший пост', labelEn: '💼 LinkedIn Trainee: first post', coins: 40, achievementId: 'linkedin_trainee',
    displayGroup: 'Маркетинг', displayGroupEn: 'Marketing', oneTimeOnly: true,
    proofHint: 'Посилання на ваш перший пост.', proofHintEn: 'Link to your first post.' },
];
const SOCIAL_GROUP_CAP_PER_MONTH = 100;

// ============ АЧІВКИ ============
// Ачівки нараховуються АВТОМАТИЧНО, без заявки й без approve/reject HR — сама
// наявність активності в системі і є "пруфом". Кожна ачівка видається людині
// ЛИШЕ ОДИН РАЗ (перевірка через AchievementsLog).
const ACHIEVEMENTS = [
  { id: 'start',   emoji: '🚀', label: 'Старт',        labelEn: 'Start',       coins: 20,
    desc: 'За реєстрацію на платформі Team Coins.', descEn: 'For joining the Team Coins platform.' },
  { id: 'streak3', emoji: '🔥', label: 'Постійність',   labelEn: 'Consistency', coins: 100,
    desc: 'Мінімум 2 Approved заявки щомісяця протягом 3 місяців підряд.',
    descEn: 'At least 2 approved claims every month for 3 consecutive months.' },
  { id: 'kudos_recognition', emoji: '💜', label: 'Визнання за вклад', labelEn: 'Recognition', coins: 100,
    desc: 'Отримувати щонайменше 1 Kudos щомісяця протягом 6 місяців підряд.',
    descEn: 'Receive at least 1 Kudos every month for 6 consecutive months.' },
  { id: 'secret_coin_irreplaceable', emoji: '💎', label: 'Незамінний', labelEn: 'Irreplaceable', coins: 50,
    desc: 'Отримати понад 280 Secret Coin протягом календарного року.',
    descEn: 'Receive more than 280 Secret Coin within a calendar year.' },
  // Ачівка з підзадачами: кожна підзадача — окрема категорія в EARN_CATEGORIES,
  // за яку людина отримує бали окремо, звичайною заявкою. tasks[].categoryId має
  // збігатися з id відповідної категорії в EARN_CATEGORIES.
  { id: 'linkedin_trainee', emoji: '💼', label: 'LinkedIn Trainee', labelEn: 'LinkedIn Trainee', coins: 100,
    desc: 'Пройди перші кроки на LinkedIn від імені компанії.', descEn: 'Take your first steps on LinkedIn for the company.',
    tasks: [
      { categoryId: 'li_trainee_profile',        label: 'Оформити профіль',            labelEn: 'Set up your profile',        coins: 30 },
      { categoryId: 'li_trainee_recommendation', label: 'Написати рекомендацію',        labelEn: 'Write a recommendation',      coins: 30 },
      { categoryId: 'li_trainee_first_post',     label: 'Написати перший пост',         labelEn: 'Write your first post',       coins: 40 },
    ] },
];

// ============ КАМПАНІЙНІ АКТИВНОСТІ (маркетинг, HR тощо) ============
// На відміну від EARN_CATEGORIES (сталий список у коді), ці категорії
// живуть ЛИШЕ у вкладці таблиці CampaignCategories і повністю керуються
// адміном через інтерфейс, без деплою коду. groupId рахується автоматично
// з тексту групи, щоб однакові за змістом групи об'єднувались в одну вкладку.

// ============ WEB APP ENTRY POINT ============

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(CURRENCY_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============ SETUP ============

function setup() {
  ensureSheets_();
}

function ensureSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_BALANCES)) {
    const sh = ss.insertSheet(SHEET_BALANCES);
    sh.appendRow(['Email', 'Name', 'Balance', 'KudosLeft', 'LastResetMonth']);
    sh.setFrozenRows(1);
    sh.getRange('E:E').setNumberFormat('@');
  }
  if (!ss.getSheetByName(SHEET_KUDOS)) {
    const sh = ss.insertSheet(SHEET_KUDOS);
    sh.appendRow(['Timestamp', 'FromEmail', 'FromName', 'ToEmail', 'ToName', 'Message']);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_ORDERS)) {
    const sh = ss.insertSheet(SHEET_ORDERS);
    sh.appendRow(['Timestamp', 'Email', 'Name', 'RewardId', 'RewardName', 'Price']);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_SUBMISSIONS)) {
    const sh = ss.insertSheet(SHEET_SUBMISSIONS);
    sh.appendRow(['Id', 'Timestamp', 'Email', 'Name', 'CategoryId', 'CategoryLabel', 'Coins', 'ProofText', 'Status', 'ReviewedBy', 'ReviewedAt']);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_ADMINS)) {
    const sh = ss.insertSheet(SHEET_ADMINS);
    sh.appendRow(['Email', 'AddedBy', 'AddedAt']);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_MANAGERS)) {
    const sh = ss.insertSheet(SHEET_MANAGERS);
    sh.appendRow(['Email', 'AddedBy', 'AddedAt']);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_SUGGESTIONS)) {
    const sh = ss.insertSheet(SHEET_SUGGESTIONS);
    sh.appendRow(['Id', 'Timestamp', 'Email', 'Name', 'Text', 'Status']);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_SECRET_COIN)) {
    const sh = ss.insertSheet(SHEET_SECRET_COIN);
    sh.appendRow(['Timestamp', 'GrantedBy', 'RecipientEmail', 'RecipientName', 'Coins', 'Reason', 'Quarter']);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_REWARDS)) {
    const sh = ss.insertSheet(SHEET_REWARDS);
    sh.appendRow(['Id', 'Name', 'NameEn', 'Price', 'Emoji', 'Desc', 'DescEn', 'Stock', 'Active']);
    sh.setFrozenRows(1);
    REWARDS_SEED.forEach(r => {
      sh.appendRow([r.id, r.name, r.nameEn, r.price, r.emoji, r.desc, r.descEn, r.stock || '', true]);
    });
  }
  if (!ss.getSheetByName(SHEET_CAMPAIGN_CATEGORIES)) {
    const sh = ss.insertSheet(SHEET_CAMPAIGN_CATEGORIES);
    sh.appendRow(['Id', 'GroupId', 'Group', 'GroupEn', 'Title', 'TitleEn', 'Coins', 'ProofHint', 'ProofHintEn', 'Active']);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_ACHIEVEMENTS_LOG)) {
    const sh = ss.insertSheet(SHEET_ACHIEVEMENTS_LOG);
    sh.appendRow(['Timestamp', 'Email', 'Name', 'AchievementId', 'Coins']);
    sh.setFrozenRows(1);
  }
}

// ============================================================
// ВАЛІДАЦІЯ (чисті функції)
// ============================================================

function validateSendKudos_({ fromEmail, toEmail, toExists, kudosLeft, message }) {
  if (!fromEmail) return { ok: false, error: 'NO_IDENTITY' };
  if (!toEmail) return { ok: false, error: 'NO_RECIPIENT' };
  if (toEmail === fromEmail) return { ok: false, error: 'SELF_KUDOS' };
  if (!toExists) return { ok: false, error: 'RECIPIENT_NOT_FOUND' };
  if (kudosLeft <= 0) return { ok: false, error: 'KUDOS_LIMIT' };
  const trimmed = (message || '').trim();
  if (!trimmed) return { ok: false, error: 'MESSAGE_REQUIRED' };
  return { ok: true };
}

function validateBuyReward_({ balance, price, stock, sold, alreadyOwned }) {
  if (alreadyOwned) return { ok: false, error: 'ALREADY_OWNED' };
  if (typeof stock === 'number' && sold >= stock) return { ok: false, error: 'SOLD_OUT' };
  if (balance < price) return { ok: false, error: 'INSUFFICIENT_BALANCE' };
  return { ok: true };
}

// Захист від formula injection: текст, що починається з =, +, -, @,
// таблиця не повинна сприймати як формулу.
function sanitizeForSheet_(text) {
  const s = String(text == null ? '' : text);
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}

function isAllowedDomain_(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.split('@');
  return parts.length === 2 && parts[1].toLowerCase() === ALLOWED_DOMAIN.toLowerCase();
}

// ============================================================
// РЕПОЗИТОРІЙ
// ============================================================

function currentMonthKey_() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1);
}

function isoWeekKey_(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + '-W' + weekNo;
}

function quarterKey_(date) {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return date.getFullYear() + '-Q' + q;
}

function previousQuarterKey_(qKey) {
  const parts = qKey.split('-Q');
  let year = Number(parts[0]), q = Number(parts[1]) - 1;
  if (q < 1) { q = 4; year -= 1; }
  return year + '-Q' + q;
}

function displayNameFromEmail_(email) {
  const local = email.split('@')[0];
  return local.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

// ПРИМІТКА: раніше тут була спроба брати ім'я з Google-профілю через
// People API ('people/me'). Довелось прибрати: у режимі деплою "Execute as: Me"
// такий виклик повертає профіль власника скрипта, а не відвідувача сторінки.
//
// AdminDirectory.Users.get(targetEmail) шукає профіль ЗА КОНКРЕТНИМ email,
// тому фізично не може повернути чужі дані. Потрібна роль Workspace з правом
// читати каталог користувачів; без неї виклик падає, і ми тихо повертаємось
// до імені, згенерованого з email.
function getRealDisplayName_(targetEmail) {
  try {
    const user = AdminDirectory.Users.get(targetEmail);
    if (user && user.name && user.name.fullName) {
      return user.name.fullName;
    }
  } catch (e) {
    // Немає прав на читання каталогу чи людина поза доменом — безпечний відкат.
  }
  return displayNameFromEmail_(targetEmail);
}

// Повертає посилання на задеплоєний веб-застосунок (.../exec).
function getAppUrl_() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (e) {
    return '';
  }
}

// Обгортає текстовий body в HTML-версію листа з кнопкою "Перейти на платформу".
function buildEmailHtml_(plainBody, appUrl) {
  const escaped = String(plainBody)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  const buttonHtml = appUrl
    ? `<div style="margin-top:22px;">
         <a href="${appUrl}" style="display:inline-block;background:#6C5CE7;color:#FFFFFF;text-decoration:none;
            padding:12px 26px;border-radius:10px;font-weight:700;font-family:Arial,sans-serif;font-size:14px;">
           Перейти на платформу / Open platform →
         </a>
       </div>`
    : '';
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#17162B;line-height:1.65;">${escaped}${buttonHtml}</div>`;
}

// Надсилає email-сповіщення. Навмисно ізольовано в try/catch: якщо лист не
// надішлеться (квота, недійсна адреса), це НЕ повинно ламати основну дію —
// людина однаково має отримати свої коїни.
function sendNotificationEmail_(toEmail, subject, body) {
  try {
    const appUrl = getAppUrl_();
    const htmlBody = buildEmailHtml_(body, appUrl);
    // name — відображуване ім'я відправника, щоб лист приходив від назви
    // платформи, а не від особистого імені власника акаунту.
    MailApp.sendEmail({ to: toEmail, subject: subject, body: body, htmlBody: htmlBody, name: CURRENCY_NAME });
  } catch (e) {
    console.log('sendNotificationEmail_ error: ' + e.message);
  }
}

function findUserRow_(sheet, email) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (data[i][0] === email) return i + 1;
  return -1;
}

function getOrCreateUserRow_(email) {
  ensureSheets_();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BALANCES);
  let row = findUserRow_(sh, email);
  const monthKey = currentMonthKey_();

  if (row === -1) {
    sh.appendRow([email, getRealDisplayName_(email), 0, 3, '']);
    row = sh.getLastRow();
    sh.getRange(row, 5).setNumberFormat('@').setValue(monthKey);
    // "Старт" видається ЛИШЕ при створенні нового рядка, а не на кожному
    // виклику: getState() викликає цю функцію кожні 60 секунд з кожної
    // відкритої вкладки, і повне сканування AchievementsLog на кожному
    // опитуванні створювало конкуренцію за глобальний LockService-лок.
    grantAchievement_(email, 'start');
  } else {
    // Ім'я НЕ перезаписується автоматично — якщо HR вручну виправить ім'я
    // в таблиці, ця правка залишається назавжди.
    const lastReset = sh.getRange(row, 5).getValue();
    if (String(lastReset) !== monthKey) {
      sh.getRange(row, 4).setValue(3);
      sh.getRange(row, 5).setNumberFormat('@').setValue(monthKey);
    }
  }
  return row;
}

// Одноразова функція для користувачів, які завели акаунт ДО впровадження
// ачівок. Запустіть її ОДИН РАЗ вручну з редактора.
function backfillStartAchievements() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BALANCES);
  const data = sh.getDataRange().getValues();
  let granted = 0;
  for (let i = 1; i < data.length; i++) {
    const email = data[i][0];
    if (email && grantAchievement_(email, 'start')) granted++;
  }
  console.log('Backfill done. Achievements granted: ' + granted);
}

function readSoldCounts_() {
  const ordersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ORDERS);
  const data = ordersSheet.getDataRange().getValues();
  const counts = {};
  for (let i = 1; i < data.length; i++) counts[data[i][3]] = (counts[data[i][3]] || 0) + 1;
  return counts;
}

// Читає всі товари (тільки Active !== false) з вкладки Rewards.
function readRewards_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REWARDS);
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const active = row[8];
    if (active === false || active === 'FALSE') continue;
    const stockRaw = row[7];
    const stock = (stockRaw === '' || stockRaw === null || stockRaw === undefined) ? null : Number(stockRaw);
    out.push({
      id: row[0], name: row[1], nameEn: row[2], price: Number(row[3]) || 0,
      emoji: row[4] || '🎁', desc: row[5] || '', descEn: row[6] || row[5] || '',
      stock: stock,
    });
  }
  return out;
}

// Стабільний groupId з довільного тексту групи ("Маркетинг", "маркетинг " → той самий).
function groupIdFromText_(text) {
  const base = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'group';
}

function readCampaignCategories_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CAMPAIGN_CATEGORIES);
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const active = row[9];
    if (active === false || active === 'FALSE') continue;
    out.push({
      id: row[0], groupId: row[1], group: row[2], groupEn: row[3] || row[2],
      title: row[4], titleEn: row[5] || row[4], coins: Number(row[6]) || 0,
      proofHint: row[7] || '', proofHintEn: row[8] || row[7] || '',
    });
  }
  return out;
}

// Шукає кампанійну активність за id серед УСІХ рядків (включно з Active=false).
function findCampaignCategoryById_(categoryId) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CAMPAIGN_CATEGORIES);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === categoryId) {
      return {
        id: data[i][0], groupId: data[i][1], group: data[i][2], groupEn: data[i][3] || data[i][2],
        title: data[i][4], titleEn: data[i][5] || data[i][4], coins: Number(data[i][6]) || 0,
        proofHint: data[i][7] || '', proofHintEn: data[i][8] || data[i][7] || '',
        active: data[i][9] !== false && data[i][9] !== 'FALSE',
      };
    }
  }
  return null;
}

function isAdmin_(email) {
  if (!email) return false;
  if (email === OWNER_EMAIL) return true;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_ADMINS);
  if (!sh) return false;
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (data[i][0] === email) return true;
  return false;
}

// Менеджер — легша роль: доступ ЛИШЕ до Secret Coin. Не бачить заявки
// на розгляд і керування адмінами/менеджерами.
function isManager_(email) {
  if (!email) return false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_MANAGERS);
  if (!sh) return false;
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (data[i][0] === email) return true;
  return false;
}

// Категорія шукається за ID щоразу заново — так заявки коректно
// перекладаються, навіть якщо текст категорії з часом зміниться.
function findCategoryLabels_(categoryId, fallbackLabel) {
  const cat = EARN_CATEGORIES.find(c => c.id === categoryId);
  if (cat) return { label: cat.label, labelEn: cat.labelEn };
  return { label: fallbackLabel, labelEn: fallbackLabel };
}

function creditBalance_(email, amount) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BALANCES);
  const row = getOrCreateUserRow_(email);
  const current = sh.getRange(row, 3).getValue();
  sh.getRange(row, 3).setValue(current + amount);
  // Будь-яке нарахування — потенційний сигнал для авто-ачівок.
  checkAutoAchievements_(email);
}

// ---------- Ачівки ----------

function hasAchievement_(email, achievementId) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ACHIEVEMENTS_LOG);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === email && data[i][3] === achievementId) return true;
  }
  return false;
}

// Порядок дій важливий: СПОЧАТКУ пишемо рядок у лог (це "печатка", що ачівку
// видано), і лише ПОТІМ кредитуємо баланс — інакше creditBalance_ →
// checkAutoAchievements_ могла б видати ту саму ачівку повторно.
function grantAchievement_(email, achievementId) {
  if (hasAchievement_(email, achievementId)) return false;
  const def = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!def) return false;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const balSheet = ss.getSheetByName(SHEET_BALANCES);
  // Навмисно findUserRow_, а НЕ getOrCreateUserRow_ — щоб уникнути рекурсії.
  const row = findUserRow_(balSheet, email);
  if (row === -1) return false;
  const name = balSheet.getRange(row, 2).getValue();

  ss.getSheetByName(SHEET_ACHIEVEMENTS_LOG).appendRow([new Date(), email, name, achievementId, def.coins]);
  creditBalance_(email, def.coins);

  sendNotificationEmail_(
    email,
    `${def.emoji} You unlocked an achievement! (Нова ачівка)`,
    `🇺🇦 Ukrainian version below / Українська версія нижче\n\nHi ${name}!\n\nYou unlocked the achievement "${def.labelEn}" on ${CURRENCY_NAME}.\nYour balance was credited +${def.coins} ${CURRENCY_EMOJI}.\n\n---\n\nПривіт, ${name}!\n\nВи отримали ачівку "${def.label}" на платформі ${CURRENCY_NAME}.\nВаш баланс поповнено на ${def.coins} ${CURRENCY_EMOJI}.`
  );
  return true;
}

function monthKeyOfDate_(date) {
  return date.getFullYear() + '-' + (date.getMonth() + 1);
}

const MIN_APPROVED_CLAIMS_PER_MONTH_FOR_STREAK = 2;
const MIN_KUDOS_PER_MONTH_FOR_RECOGNITION = 1;
const KUDOS_RECOGNITION_STREAK_MONTHS = 6;
const SECRET_COIN_ANNUAL_THRESHOLD = 280;

// Читає Submissions/KudosLog/SecretCoinLog ОДИН раз і повертає окремі сигнали
// для кожної ачівки.
function collectAchievementSignals_(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const submissionCountByMonth = {};
  const approvedCategoryIds = {};

  const subData = ss.getSheetByName(SHEET_SUBMISSIONS).getDataRange().getValues();
  for (let i = 1; i < subData.length; i++) {
    if (subData[i][2] !== email || subData[i][8] !== 'Approved') continue;
    const mk = monthKeyOfDate_(new Date(subData[i][1]));
    submissionCountByMonth[mk] = (submissionCountByMonth[mk] || 0) + 1;
    approvedCategoryIds[subData[i][4]] = true;
  }

  const kudosCountByMonth = {};
  const kudosData = ss.getSheetByName(SHEET_KUDOS).getDataRange().getValues();
  for (let i = 1; i < kudosData.length; i++) {
    if (kudosData[i][3] !== email) continue;
    const mk = monthKeyOfDate_(new Date(kudosData[i][0]));
    kudosCountByMonth[mk] = (kudosCountByMonth[mk] || 0) + 1;
  }

  const currentYear = new Date().getFullYear();
  let secretCoinTotalThisYear = 0;
  const scData = ss.getSheetByName(SHEET_SECRET_COIN).getDataRange().getValues();
  for (let i = 1; i < scData.length; i++) {
    if (scData[i][2] !== email) continue;
    const d = new Date(scData[i][0]);
    if (d.getFullYear() === currentYear) secretCoinTotalThisYear += Number(scData[i][4]) || 0;
  }

  return { submissionCountByMonth, approvedCategoryIds, kudosCountByMonth, secretCoinTotalThisYear };
}

function lastNMonthKeys_(n) {
  const now = new Date();
  const out = [];
  for (let i = 0; i < n; i++) out.push(monthKeyOfDate_(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  return out;
}

// Перевіряє й видає всі авто-ачівки одразу. Викликається з creditBalance_.
function checkAutoAchievements_(email) {
  const stillNeedsCheck = ACHIEVEMENTS.some(a => !hasAchievement_(email, a.id) && a.id !== 'start');
  if (!stillNeedsCheck) return;

  const signals = collectAchievementSignals_(email);

  if (!hasAchievement_(email, 'streak3')) {
    const allMonthsQualify = lastNMonthKeys_(3).every(mk => (signals.submissionCountByMonth[mk] || 0) >= MIN_APPROVED_CLAIMS_PER_MONTH_FOR_STREAK);
    if (allMonthsQualify) grantAchievement_(email, 'streak3');
  }

  if (!hasAchievement_(email, 'kudos_recognition')) {
    const allMonthsQualify = lastNMonthKeys_(KUDOS_RECOGNITION_STREAK_MONTHS).every(mk => (signals.kudosCountByMonth[mk] || 0) >= MIN_KUDOS_PER_MONTH_FOR_RECOGNITION);
    if (allMonthsQualify) grantAchievement_(email, 'kudos_recognition');
  }

  if (!hasAchievement_(email, 'secret_coin_irreplaceable')) {
    if (signals.secretCoinTotalThisYear > SECRET_COIN_ANNUAL_THRESHOLD) grantAchievement_(email, 'secret_coin_irreplaceable');
  }

  ACHIEVEMENTS.filter(a => a.tasks).forEach(a => {
    if (hasAchievement_(email, a.id)) return;
    const allTasksDone = a.tasks.every(task => signals.approvedCategoryIds[task.categoryId]);
    if (allTasksDone) grantAchievement_(email, a.id);
  });
}

// Список усіх ачівок для людини з позначкою earned і прогресом для неотриманих.
function readAchievementsFor_(email, isPrivileged) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ACHIEVEMENTS_LOG);
  const data = sh.getDataRange().getValues();
  const earnedAt = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === email) earnedAt[data[i][3]] = data[i][0];
  }

  let signals = null;

  return ACHIEVEMENTS.map(a => {
    const earned = !!earnedAt[a.id];
    const base = {
      id: a.id, emoji: a.emoji, label: a.label, labelEn: a.labelEn, coins: a.coins,
      desc: a.desc, descEn: a.descEn,
      earned,
      earnedAt: earnedAt[a.id] ? new Date(earnedAt[a.id]).toISOString() : null,
    };
    if (earned) return base;

    if (!signals) signals = collectAchievementSignals_(email);

    if (a.id === 'streak3') {
      const current = lastNMonthKeys_(3).filter(mk => (signals.submissionCountByMonth[mk] || 0) >= MIN_APPROVED_CLAIMS_PER_MONTH_FOR_STREAK).length;
      base.progress = { current, target: 3 };
    } else if (a.id === 'kudos_recognition') {
      const current = lastNMonthKeys_(KUDOS_RECOGNITION_STREAK_MONTHS).filter(mk => (signals.kudosCountByMonth[mk] || 0) >= MIN_KUDOS_PER_MONTH_FOR_RECOGNITION).length;
      base.progress = { current, target: KUDOS_RECOGNITION_STREAK_MONTHS };
    } else if (a.id === 'secret_coin_irreplaceable') {
      // Поріг бачить лише адмін/менеджер; звичайний користувач — лише накопичену суму.
      if (isPrivileged) {
        base.progress = { current: Math.min(signals.secretCoinTotalThisYear, SECRET_COIN_ANNUAL_THRESHOLD), target: SECRET_COIN_ANNUAL_THRESHOLD };
      } else {
        base.progress = { current: signals.secretCoinTotalThisYear };
      }
    } else if (a.tasks) {
      const tasksWithStatus = a.tasks.map(task => ({
        label: task.label, labelEn: task.labelEn, coins: task.coins,
        done: !!signals.approvedCategoryIds[task.categoryId],
      }));
      base.tasks = tasksWithStatus;
      base.progress = { current: tasksWithStatus.filter(x => x.done).length, target: tasksWithStatus.length };
    } else if (a.id === 'start') {
      base.progress = { current: 0, target: 1 };
    }
    return base;
  });
}

// ============================================================
// ЗАСТОСУНОК — публічне API
// ============================================================

function getState() {
  const email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('NO_IDENTITY');
  if (!isAllowedDomain_(email)) throw new Error('WRONG_DOMAIN');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_BALANCES);
    const row = getOrCreateUserRow_(email);
    const values = sh.getRange(row, 1, 1, 5).getValues()[0];
    const name = values[1], balance = values[2], kudosLeft = values[3];

    const allData = sh.getDataRange().getValues();
    const colleagues = [];
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] !== email) colleagues.push({ email: allData[i][0], name: allData[i][1] || allData[i][0] });
    }
    colleagues.sort((a, b) => a.name.localeCompare(b.name));

    const kudosSheet = ss.getSheetByName(SHEET_KUDOS);
    const kudosData = kudosSheet.getDataRange().getValues();
    const monthKey = currentMonthKey_();

    // Особистий feed: тільки Kudos, де я — відправник або отримувач
    const myFeed = [];
    for (let i = kudosData.length - 1; i >= 1 && myFeed.length < 15; i--) {
      const fromE = kudosData[i][1], toE = kudosData[i][3];
      if (fromE !== email && toE !== email) continue;
      myFeed.push({
        direction: fromE === email ? 'sent' : 'received',
        withName: fromE === email ? kudosData[i][4] : kudosData[i][2],
        msg: kudosData[i][5],
      });
    }

    // Лідерборд Kudos: топ-5 за отриманими Kudos цього місяця
    const kudosCountByEmail = {};
    for (let i = 1; i < kudosData.length; i++) {
      const ts = new Date(kudosData[i][0]);
      if (ts.getFullYear() + '-' + (ts.getMonth() + 1) !== monthKey) continue;
      const toE = kudosData[i][3], toN = kudosData[i][4];
      if (!kudosCountByEmail[toE]) kudosCountByEmail[toE] = { name: toN, count: 0 };
      kudosCountByEmail[toE].count++;
    }
    const kudosLeaderboard = Object.values(kudosCountByEmail)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const ordersSheet = ss.getSheetByName(SHEET_ORDERS);
    const ordersData = ordersSheet.getDataRange().getValues();
    const soldCounts = readSoldCounts_();
    const owned = [];
    for (let i = 1; i < ordersData.length; i++) if (ordersData[i][1] === email) owned.push(ordersData[i][3]);

    const rewards = readRewards_().map(r => {
      const sold = soldCounts[r.id] || 0;
      const soldOut = r.stock ? sold >= r.stock : false;
      const remaining = r.stock ? Math.max(0, r.stock - sold) : null;
      return Object.assign({}, r, { soldOut, remaining });
    });

    const subSheet = ss.getSheetByName(SHEET_SUBMISSIONS);
    const subData = subSheet.getDataRange().getValues();
    const mySubmissions = [];
    for (let i = subData.length - 1; i >= 1 && mySubmissions.length < 10; i--) {
      if (subData[i][2] === email) {
        const labels = findCategoryLabels_(subData[i][4], subData[i][5]);
        mySubmissions.push({ id: subData[i][0], categoryLabel: labels.label, categoryLabelEn: labels.labelEn, coins: subData[i][6], status: subData[i][8] });
      }
    }

    // Лідери за категорією: топ-1 за сумою Approved заявок цього місяця
    const categoryTotals = {};
    for (let i = 1; i < subData.length; i++) {
      if (subData[i][8] !== 'Approved') continue;
      const ts = new Date(subData[i][1]);
      if (ts.getFullYear() + '-' + (ts.getMonth() + 1) !== monthKey) continue;
      const catId = subData[i][4], subEmail = subData[i][2], subName = subData[i][3], coins = Number(subData[i][6]) || 0;
      if (!categoryTotals[catId]) categoryTotals[catId] = {};
      if (!categoryTotals[catId][subEmail]) categoryTotals[catId][subEmail] = { name: subName, coins: 0 };
      categoryTotals[catId][subEmail].coins += coins;
    }
    const categoryLeaders = EARN_CATEGORIES.map(cat => {
      const totals = categoryTotals[cat.id];
      if (!totals) return { categoryId: cat.id, label: cat.label, labelEn: cat.labelEn, leaderName: null, coins: 0 };
      let best = null;
      Object.values(totals).forEach(v => { if (!best || v.coins > best.coins) best = v; });
      return { categoryId: cat.id, label: cat.label, labelEn: cat.labelEn, leaderName: best.name, coins: best.coins };
    }).filter(c => c.leaderName);

    // ---------- Історія транзакцій (ledger) ----------
    const secretCoinData = ss.getSheetByName(SHEET_SECRET_COIN).getDataRange().getValues();

    const ledgerRaw = [];
    for (let i = 1; i < kudosData.length; i++) {
      if (kudosData[i][3] !== email) continue;
      ledgerRaw.push({ ts: new Date(kudosData[i][0]), type: 'EARN', source: 'Kudos', reference: kudosData[i][2] || '', amount: 10 });
    }
    for (let i = 1; i < subData.length; i++) {
      if (subData[i][2] !== email || subData[i][8] !== 'Approved') continue;
      const decidedTs = subData[i][10] || subData[i][1];
      ledgerRaw.push({ ts: new Date(decidedTs), type: 'EARN', source: subData[i][5], reference: '', amount: Number(subData[i][6]) || 0 });
    }
    for (let i = 1; i < ordersData.length; i++) {
      if (ordersData[i][1] !== email) continue;
      ledgerRaw.push({ ts: new Date(ordersData[i][0]), type: 'SPEND', source: ordersData[i][4], reference: '', amount: Number(ordersData[i][5]) || 0 });
    }
    for (let i = 1; i < secretCoinData.length; i++) {
      if (secretCoinData[i][2] !== email) continue;
      ledgerRaw.push({ ts: new Date(secretCoinData[i][0]), type: 'EARN', source: 'Secret Coin', reference: secretCoinData[i][5] || '', amount: Number(secretCoinData[i][4]) || 0 });
    }
    ledgerRaw.sort((a, b) => b.ts - a.ts);
    const ledger = ledgerRaw.slice(0, 20).map(x => ({ type: x.type, source: x.source, reference: x.reference, amount: x.amount }));

    const admin = isAdmin_(email);
    const manager = isManager_(email);
    let pendingSubmissions = [];
    let admins = [];
    let managers = [];
    let pendingSuggestions = [];
    let secretCoinRemaining = null;

    if (admin) {
      for (let i = 1; i < subData.length; i++) {
        if (subData[i][8] === 'Pending') {
          const labels = findCategoryLabels_(subData[i][4], subData[i][5]);
          pendingSubmissions.push({
            id: subData[i][0], email: subData[i][2], name: subData[i][3],
            categoryLabel: labels.label, categoryLabelEn: labels.labelEn, coins: subData[i][6], proofText: subData[i][7],
          });
        }
      }
      const adminData = ss.getSheetByName(SHEET_ADMINS).getDataRange().getValues();
      for (let i = 1; i < adminData.length; i++) admins.push(adminData[i][0]);

      const managerData = ss.getSheetByName(SHEET_MANAGERS).getDataRange().getValues();
      for (let i = 1; i < managerData.length; i++) managers.push(managerData[i][0]);

      const suggData = ss.getSheetByName(SHEET_SUGGESTIONS).getDataRange().getValues();
      for (let i = 1; i < suggData.length; i++) {
        if (suggData[i][5] === 'New') {
          pendingSuggestions.push({ id: suggData[i][0], email: suggData[i][2], name: suggData[i][3], text: suggData[i][4] });
        }
      }
    }

    // Залишок квартального бюджету Secret Coin — для адміна і менеджера.
    if (admin || manager) {
      const qKey = quarterKey_(new Date());
      let grantedThisQuarter = 0;
      for (let i = 1; i < secretCoinData.length; i++) {
        if (secretCoinData[i][6] === qKey) grantedThisQuarter += Number(secretCoinData[i][4]) || 0;
      }
      secretCoinRemaining = Math.max(0, 100 - grantedThisQuarter);
    }

    return {
      email, name, balance, kudosLeft, colleagues, myFeed, kudosLeaderboard, categoryLeaders, rewards, owned,
      announcement: ANNOUNCEMENT, currencyName: CURRENCY_NAME, currencyEmoji: CURRENCY_EMOJI,
      earnCategories: EARN_CATEGORIES, campaignCategories: readCampaignCategories_(), mySubmissions,
      achievements: readAchievementsFor_(email, admin || manager),
      isManager: manager, managers,
      isAdmin: admin, pendingSubmissions, admins, ownerEmail: OWNER_EMAIL, pendingSuggestions,
      backendVersion: BACKEND_VERSION, secretCoinRemaining, ledger,
    };
  } finally {
    lock.releaseLock();
  }
}

function sendKudos(toEmail, message) {
  const fromEmail = Session.getActiveUser().getEmail();
  if (!isAllowedDomain_(fromEmail)) throw new Error('WRONG_DOMAIN');

  let fromName, toName, cleanMessage;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_BALANCES);
    const fromRow = getOrCreateUserRow_(fromEmail);
    const kudosLeft = sh.getRange(fromRow, 4).getValue();
    const toRow = findUserRow_(sh, toEmail);

    const check = validateSendKudos_({ fromEmail, toEmail, toExists: toRow !== -1, kudosLeft, message });
    if (!check.ok) throw new Error(check.error);

    cleanMessage = sanitizeForSheet_(message.trim());
    fromName = sh.getRange(fromRow, 2).getValue();
    toName = sh.getRange(toRow, 2).getValue();

    sh.getRange(fromRow, 4).setValue(kudosLeft - 1);
  } finally {
    lock.releaseLock();
  }

  // creditBalance_ викликається ПІСЛЯ звільнення блокування — тримати два
  // locks одночасно ризиковано.
  creditBalance_(toEmail, 10);
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_KUDOS)
    .appendRow([new Date(), fromEmail, fromName, toEmail, toName, cleanMessage]);

  sendNotificationEmail_(
    toEmail,
    '💜 You got Kudos! (Вам подякували)',
    `🇺🇦 Ukrainian version below / Українська версія нижче\n\nHi ${toName}!\n\n${fromName} thanked you on ${CURRENCY_NAME}:\n"${cleanMessage}"\n\nYour balance was credited +10 ${CURRENCY_EMOJI}.\n\n---\n\nПривіт, ${toName}!\n\n${fromName} подякував(ла) вам на платформі ${CURRENCY_NAME}:\n"${cleanMessage}"\n\nВаш баланс поповнено на 10 ${CURRENCY_EMOJI}.`
  );

  return getState();
}

function buyReward(rewardId) {
  const email = Session.getActiveUser().getEmail();
  if (!isAllowedDomain_(email)) throw new Error('WRONG_DOMAIN');

  const r = readRewards_().find(x => x.id === rewardId);
  if (!r) throw new Error('UNKNOWN_REWARD');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_BALANCES);
    const row = getOrCreateUserRow_(email);
    const balance = sh.getRange(row, 3).getValue();

    const soldCounts = readSoldCounts_();
    const ordersSheet = ss.getSheetByName(SHEET_ORDERS);
    const ordersData = ordersSheet.getDataRange().getValues();
    let alreadyOwned = false;
    for (let i = 1; i < ordersData.length; i++) if (ordersData[i][1] === email && ordersData[i][3] === rewardId) alreadyOwned = true;

    const check = validateBuyReward_({ balance, price: r.price, stock: r.stock, sold: soldCounts[r.id] || 0, alreadyOwned });
    if (!check.ok) throw new Error(check.error);

    sh.getRange(row, 3).setValue(balance - r.price);
    const name = sh.getRange(row, 2).getValue();
    ordersSheet.appendRow([new Date(), email, name, r.id, r.name, r.price]);
  } finally {
    lock.releaseLock();
  }
  return getState();
}

// ---------- Заявки на коїни за категоріями з "пруфом" ----------

function submitClaim(categoryId, proofText) {
  const email = Session.getActiveUser().getEmail();
  if (!isAllowedDomain_(email)) throw new Error('WRONG_DOMAIN');

  // Спершу шукаємо серед базових категорій (у коді), потім серед кампанійних
  // (у таблиці). Ліміти по тижню/місяцю діють лише для базових.
  let cat = EARN_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) {
    const campaignCat = findCampaignCategoryById_(categoryId);
    if (campaignCat && campaignCat.active) {
      cat = { id: campaignCat.id, label: campaignCat.title, labelEn: campaignCat.titleEn, coins: campaignCat.coins };
    }
  }
  if (!cat) throw new Error('UNKNOWN_CATEGORY');

  const cleanProof = sanitizeForSheet_((proofText || '').trim());
  if (!cleanProof) throw new Error('PROOF_REQUIRED');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const subSheet = ss.getSheetByName(SHEET_SUBMISSIONS);
    const subData = subSheet.getDataRange().getValues();
    const now = new Date();
    const weekKey = isoWeekKey_(now);
    const monthKey = currentMonthKey_();

    if (cat.period) {
      let count = 0;
      for (let i = 1; i < subData.length; i++) {
        if (subData[i][2] !== email || subData[i][4] !== cat.id) continue;
        if (subData[i][8] === 'Rejected') continue;
        const ts = new Date(subData[i][1]);
        const key = cat.period === 'week' ? isoWeekKey_(ts) : (ts.getFullYear() + '-' + (ts.getMonth() + 1));
        const curKey = cat.period === 'week' ? weekKey : monthKey;
        if (key === curKey) count++;
      }
      if (count >= cat.periodCap) {
        throw new Error('CATEGORY_LIMIT|' + cat.period);
      }
    }

    if (cat.group) {
      const groupIds = EARN_CATEGORIES.filter(c => c.group === cat.group).map(c => c.id);
      let groupSum = 0;
      for (let i = 1; i < subData.length; i++) {
        if (subData[i][2] !== email || groupIds.indexOf(subData[i][4]) === -1) continue;
        if (subData[i][8] === 'Rejected') continue;
        const ts = new Date(subData[i][1]);
        if ((ts.getFullYear() + '-' + (ts.getMonth() + 1)) === monthKey) groupSum += Number(subData[i][6]);
      }
      if (groupSum + cat.coins > SOCIAL_GROUP_CAP_PER_MONTH) {
        throw new Error('SOCIAL_CAP|' + SOCIAL_GROUP_CAP_PER_MONTH);
      }
    }

    // Одноразові категорії: якщо вже є Pending чи Approved заявка, нову не
    // приймаємо. Rejected НЕ блокує — можна спробувати ще раз.
    if (cat.oneTimeOnly) {
      for (let i = 1; i < subData.length; i++) {
        if (subData[i][2] === email && subData[i][4] === cat.id && subData[i][8] !== 'Rejected') {
          throw new Error('CATEGORY_ALREADY_DONE');
        }
      }
    }

    const row = getOrCreateUserRow_(email);
    const name = ss.getSheetByName(SHEET_BALANCES).getRange(row, 2).getValue();

    const id = Utilities.getUuid();
    subSheet.appendRow([id, now, email, name, cat.id, cat.label, cat.coins, cleanProof, 'Pending', '', '']);
  } finally {
    lock.releaseLock();
  }
  return getState();
}

function reviewSubmission(submissionId, decision) {
  const reviewerEmail = Session.getActiveUser().getEmail();
  if (!isAllowedDomain_(reviewerEmail)) throw new Error('WRONG_DOMAIN');
  if (!isAdmin_(reviewerEmail)) throw new Error('ADMIN_ONLY_REVIEW');
  if (decision !== 'approve' && decision !== 'reject') throw new Error('UNKNOWN_DECISION');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const subSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SUBMISSIONS);
    const data = subSheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) if (data[i][0] === submissionId) { rowIndex = i + 1; break; }
    if (rowIndex === -1) throw new Error('SUBMISSION_NOT_FOUND');

    const status = subSheet.getRange(rowIndex, 9).getValue();
    if (status !== 'Pending') throw new Error('ALREADY_REVIEWED');

    const email = subSheet.getRange(rowIndex, 3).getValue();
    const coins = subSheet.getRange(rowIndex, 7).getValue();

    subSheet.getRange(rowIndex, 9).setValue(decision === 'approve' ? 'Approved' : 'Rejected');
    subSheet.getRange(rowIndex, 10).setValue(reviewerEmail);
    subSheet.getRange(rowIndex, 11).setValue(new Date());

    if (decision === 'approve') creditBalance_(email, coins);
  } finally {
    lock.releaseLock();
  }
  return getState();
}

// ---------- Адміністрування ----------

function addAdmin(email) {
  const actorEmail = Session.getActiveUser().getEmail();
  if (!isAdmin_(actorEmail)) throw new Error('ADMIN_ONLY_ADD');
  email = (email || '').trim().toLowerCase();
  if (!isAllowedDomain_(email)) throw new Error('EMAIL_DOMAIN|' + ALLOWED_DOMAIN);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (isAdmin_(email)) throw new Error('ALREADY_ADMIN');
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMINS).appendRow([email, actorEmail, new Date()]);
  } finally {
    lock.releaseLock();
  }
  return getState();
}

function removeAdmin(email) {
  const actorEmail = Session.getActiveUser().getEmail();
  if (!isAdmin_(actorEmail)) throw new Error('ADMIN_ONLY_MANAGE');
  if (email === OWNER_EMAIL) throw new Error('CANNOT_REMOVE_OWNER');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMINS);
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) { sh.deleteRow(i + 1); break; }
    }
  } finally {
    lock.releaseLock();
  }
  return getState();
}

function addManager(email) {
  const actorEmail = Session.getActiveUser().getEmail();
  if (!isAdmin_(actorEmail)) throw new Error('ADMIN_ONLY_ADD');
  email = (email || '').trim().toLowerCase();
  if (!isAllowedDomain_(email)) throw new Error('EMAIL_DOMAIN|' + ALLOWED_DOMAIN);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (isManager_(email)) throw new Error('ALREADY_MANAGER');
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MANAGERS).appendRow([email, actorEmail, new Date()]);
  } finally {
    lock.releaseLock();
  }
  return getState();
}

function removeManager(email) {
  const actorEmail = Session.getActiveUser().getEmail();
  if (!isAdmin_(actorEmail)) throw new Error('ADMIN_ONLY_MANAGE');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MANAGERS);
    const data = sh.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) { sh.deleteRow(i + 1); found = true; break; }
    }
    if (!found) throw new Error('UNKNOWN_MANAGER');
  } finally {
    lock.releaseLock();
  }
  return getState();
}

// ---------- Secret Coin ----------
// entries: [{ email, coins, reason }] — 1 або 2 отримувачі, сума coins <= 100.
// Квартальний бюджет — до 100 коїнів сумарно на всю компанію.
function grantSecretCoin(entries) {
  const actorEmail = Session.getActiveUser().getEmail();
  if (!isAdmin_(actorEmail) && !isManager_(actorEmail)) throw new Error('ADMIN_ONLY_SC');
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 2) {
    throw new Error('SK_RECIPIENT_COUNT');
  }

  let total = 0;
  entries.forEach(function(e){ total += Number(e.coins) || 0; });
  if (total <= 0 || total > 100) throw new Error('SC_TOTAL_RANGE');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  const notifications = [];
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(SHEET_SECRET_COIN);
    const logData = logSheet.getDataRange().getValues();
    const now = new Date();
    const qKey = quarterKey_(now);
    const prevQKey = previousQuarterKey_(qKey);

    for (let idx = 0; idx < entries.length; idx++) {
      const email = (entries[idx].email || '').trim().toLowerCase();
      if (!isAllowedDomain_(email)) throw new Error('RECIPIENT_DOMAIN|' + ALLOWED_DOMAIN);
      for (let i = 1; i < logData.length; i++) {
        if (logData[i][2] === email && logData[i][6] === prevQKey) {
          throw new Error('SC_CONSECUTIVE_QUARTER|' + (logData[i][3] || email));
        }
        if (logData[i][2] === email && logData[i][6] === qKey) {
          throw new Error('SC_ALREADY_THIS_QUARTER|' + (logData[i][3] || email));
        }
      }
    }

    let alreadyGrantedThisQuarter = 0;
    for (let i = 1; i < logData.length; i++) {
      if (logData[i][6] === qKey) alreadyGrantedThisQuarter += Number(logData[i][4]) || 0;
    }
    if (alreadyGrantedThisQuarter + total > 100) {
      const remaining = Math.max(0, 100 - alreadyGrantedThisQuarter);
      throw new Error('SC_QUARTER_BUDGET|' + alreadyGrantedThisQuarter + '|' + remaining);
    }

    for (let idx = 0; idx < entries.length; idx++) {
      const email = (entries[idx].email || '').trim().toLowerCase();
      const coins = Number(entries[idx].coins) || 0;
      if (coins <= 0) continue;
      const reason = sanitizeForSheet_((entries[idx].reason || '').trim());
      const row = getOrCreateUserRow_(email);
      const name = ss.getSheetByName(SHEET_BALANCES).getRange(row, 2).getValue();
      creditBalance_(email, coins);
      logSheet.appendRow([now, actorEmail, email, name, coins, reason, qKey]);
      notifications.push({ email: email, name: name, coins: coins, reason: reason });
    }
  } finally {
    lock.releaseLock();
  }

  notifications.forEach(function(n){
    sendNotificationEmail_(
      n.email,
      '🪙 You got Secret Coin! (Ви отримали Secret Coin)',
      `🇺🇦 Ukrainian version below / Українська версія нижче\n\nHi ${n.name}!\n\nYour manager granted you Secret Coin on ${CURRENCY_NAME}:\n"${n.reason}"\n\nYour balance was credited +${n.coins} ${CURRENCY_EMOJI}.\n\n---\n\nПривіт, ${n.name}!\n\nВаш керівник відзначив вас Secret Coin на платформі ${CURRENCY_NAME}:\n"${n.reason}"\n\nВаш баланс поповнено на ${n.coins} ${CURRENCY_EMOJI}.`
    );
  });

  return getState();
}

// ============================================================
// Адмін: керування товарами Reward Shop
// ============================================================

function slugify_(text) {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'item';
  return base + '-' + Math.random().toString(36).slice(2, 7);
}

function addReward(name, nameEn, price, emoji, desc, descEn, stock) {
  const actorEmail = Session.getActiveUser().getEmail();
  if (!isAdmin_(actorEmail)) throw new Error('ADMIN_ONLY_REWARDS');

  const cleanName = sanitizeForSheet_((name || '').trim());
  if (!cleanName) throw new Error('REWARD_NAME_REQUIRED');

  const cleanPrice = Number(price);
  if (!cleanPrice || cleanPrice <= 0 || !Number.isFinite(cleanPrice)) throw new Error('REWARD_PRICE_INVALID');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REWARDS);
    const id = slugify_(cleanName);
    const cleanNameEn = sanitizeForSheet_((nameEn || '').trim()) || cleanName;
    const cleanDesc = sanitizeForSheet_((desc || '').trim());
    const cleanDescEn = sanitizeForSheet_((descEn || '').trim()) || cleanDesc;
    const cleanEmoji = (emoji || '').trim() || '🎁';
    const cleanStock = stock ? Math.max(0, Math.floor(Number(stock)) || 0) : '';
    sh.appendRow([id, cleanName, cleanNameEn, cleanPrice, cleanEmoji, cleanDesc, cleanDescEn, cleanStock, true]);
  } finally {
    lock.releaseLock();
  }
  return getState();
}

function removeReward(rewardId) {
  const actorEmail = Session.getActiveUser().getEmail();
  if (!isAdmin_(actorEmail)) throw new Error('ADMIN_ONLY_REWARDS');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REWARDS);
    const data = sh.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === rewardId) {
        sh.getRange(i + 1, 9).setValue(false); // м'яке видалення — Active = false
        found = true;
        break;
      }
    }
    if (!found) throw new Error('UNKNOWN_REWARD');
  } finally {
    lock.releaseLock();
  }
  return getState();
}

// ============================================================
// Адмін: керування кампанійними активностями (маркетинг, HR тощо)
// ============================================================

function addCampaignCategory(group, groupEn, title, titleEn, coins, proofHint, proofHintEn) {
  const actorEmail = Session.getActiveUser().getEmail();
  if (!isAdmin_(actorEmail)) throw new Error('ADMIN_ONLY_CAMPAIGN');

  const cleanGroup = sanitizeForSheet_((group || '').trim());
  const cleanTitle = sanitizeForSheet_((title || '').trim());
  if (!cleanGroup || !cleanTitle) throw new Error('CAMPAIGN_FIELDS_REQUIRED');

  const cleanCoins = Number(coins);
  if (!cleanCoins || cleanCoins <= 0 || !Number.isFinite(cleanCoins)) throw new Error('CAMPAIGN_PRICE_INVALID');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CAMPAIGN_CATEGORIES);
    const groupId = groupIdFromText_(cleanGroup);
    const id = slugify_(cleanTitle);
    const cleanGroupEn = sanitizeForSheet_((groupEn || '').trim()) || cleanGroup;
    const cleanTitleEn = sanitizeForSheet_((titleEn || '').trim()) || cleanTitle;
    const cleanProofHint = sanitizeForSheet_((proofHint || '').trim());
    const cleanProofHintEn = sanitizeForSheet_((proofHintEn || '').trim()) || cleanProofHint;
    sh.appendRow([id, groupId, cleanGroup, cleanGroupEn, cleanTitle, cleanTitleEn, cleanCoins, cleanProofHint, cleanProofHintEn, true]);
  } finally {
    lock.releaseLock();
  }
  return getState();
}

function removeCampaignCategory(categoryId) {
  const actorEmail = Session.getActiveUser().getEmail();
  if (!isAdmin_(actorEmail)) throw new Error('ADMIN_ONLY_CAMPAIGN');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CAMPAIGN_CATEGORIES);
    const data = sh.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === categoryId) {
        sh.getRange(i + 1, 10).setValue(false);
        found = true;
        break;
      }
    }
    if (!found) throw new Error('UNKNOWN_CAMPAIGN_CATEGORY');
  } finally {
    lock.releaseLock();
  }
  return getState();
}

// ============================================================
// Відгуки / пропозиції — доступні будь-кому; адмін бачить нові
// (Status = 'New') і може позначити прочитаним.
// ============================================================

function submitSuggestion(text) {
  const email = Session.getActiveUser().getEmail();
  if (!isAllowedDomain_(email)) throw new Error('WRONG_DOMAIN');

  const clean = sanitizeForSheet_((text || '').trim());
  if (!clean) throw new Error('SUGGESTION_TEXT_REQUIRED');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const row = getOrCreateUserRow_(email);
    const name = ss.getSheetByName(SHEET_BALANCES).getRange(row, 2).getValue();
    ss.getSheetByName(SHEET_SUGGESTIONS).appendRow([Utilities.getUuid(), new Date(), email, name, clean, 'New']);
  } finally {
    lock.releaseLock();
  }
  return getState();
}

function markSuggestionRead(id) {
  const actorEmail = Session.getActiveUser().getEmail();
  if (!isAdmin_(actorEmail)) throw new Error('ADMIN_ONLY_REVIEW');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SUGGESTIONS);
    const data = sh.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sh.getRange(i + 1, 6).setValue('Read'); found = true; break; }
    }
    if (!found) throw new Error('SUGGESTION_NOT_FOUND');
  } finally {
    lock.releaseLock();
  }
  return getState();
}

// ============================================================
// Адмінська статистика для огляду пілоту. Окрема функція, а не частина
// getState(), бо це важче обчислення, потрібне лише на сторінці "Статистика".
// ============================================================

function getAdminStats() {
  const email = Session.getActiveUser().getEmail();
  if (!isAdmin_(email)) throw new Error('ADMIN_ONLY_REVIEW');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const balData = ss.getSheetByName(SHEET_BALANCES).getDataRange().getValues();
  const totalUsers = balData.length - 1;
  let totalCoinsHeld = 0;
  for (let i = 1; i < balData.length; i++) totalCoinsHeld += Number(balData[i][2]) || 0;

  const kudosData = ss.getSheetByName(SHEET_KUDOS).getDataRange().getValues();
  const totalKudosGiven = kudosData.length - 1;
  const givers = {}, receivers = {};
  for (let i = 1; i < kudosData.length; i++) {
    givers[kudosData[i][1]] = true;
    receivers[kudosData[i][3]] = true;
  }

  const subData = ss.getSheetByName(SHEET_SUBMISSIONS).getDataRange().getValues();
  const totalClaims = subData.length - 1;
  let claimsApproved = 0, claimsRejected = 0, claimsPending = 0;
  const categoryCounts = {};
  for (let i = 1; i < subData.length; i++) {
    const status = subData[i][8];
    if (status === 'Approved') claimsApproved++;
    else if (status === 'Rejected') claimsRejected++;
    else claimsPending++;
    const label = subData[i][5];
    categoryCounts[label] = (categoryCounts[label] || 0) + 1;
  }
  let topClaimCategory = null, topClaimCategoryCount = 0;
  Object.keys(categoryCounts).forEach(k => {
    if (categoryCounts[k] > topClaimCategoryCount) { topClaimCategory = k; topClaimCategoryCount = categoryCounts[k]; }
  });

  const scData = ss.getSheetByName(SHEET_SECRET_COIN).getDataRange().getValues();
  const secretCoinGrantsCount = scData.length - 1;
  let secretCoinTotalCoins = 0;
  for (let i = 1; i < scData.length; i++) secretCoinTotalCoins += Number(scData[i][4]) || 0;

  const ordData = ss.getSheetByName(SHEET_ORDERS).getDataRange().getValues();
  const totalOrders = ordData.length - 1;
  let totalCoinsSpent = 0;
  const rewardCounts = {};
  for (let i = 1; i < ordData.length; i++) {
    totalCoinsSpent += Number(ordData[i][5]) || 0;
    const rName = ordData[i][4];
    rewardCounts[rName] = (rewardCounts[rName] || 0) + 1;
  }
  let topReward = null, topRewardCount = 0;
  Object.keys(rewardCounts).forEach(k => {
    if (rewardCounts[k] > topRewardCount) { topReward = k; topRewardCount = rewardCounts[k]; }
  });

  const suggData = ss.getSheetByName(SHEET_SUGGESTIONS).getDataRange().getValues();
  const totalSuggestions = suggData.length - 1;
  let newSuggestions = 0;
  for (let i = 1; i < suggData.length; i++) if (suggData[i][5] === 'New') newSuggestions++;

  return {
    totalUsers, totalCoinsHeld,
    totalKudosGiven, uniqueKudosGivers: Object.keys(givers).length, uniqueKudosReceivers: Object.keys(receivers).length,
    totalClaims, claimsApproved, claimsRejected, claimsPending, topClaimCategory, topClaimCategoryCount,
    secretCoinGrantsCount, secretCoinTotalCoins,
    totalOrders, totalCoinsSpent, topReward, topRewardCount,
    totalSuggestions, newSuggestions,
  };
}

// Архів прочитаних відгуків (Status = 'Read').
function getSuggestionsArchive() {
  const email = Session.getActiveUser().getEmail();
  if (!isAdmin_(email)) throw new Error('ADMIN_ONLY_REVIEW');

  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SUGGESTIONS).getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === 'Read') {
      out.push({ id: data[i][0], timestamp: data[i][1], name: data[i][3], text: data[i][4] });
    }
  }
  out.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return out;
}

  return { setup, getState, sendKudos, buyReward, submitClaim, reviewSubmission, addAdmin, removeAdmin, addManager, removeManager, grantSecretCoin, addReward, removeReward, addCampaignCategory, removeCampaignCategory, submitSuggestion, markSuggestionRead, getAdminStats, getSuggestionsArchive, quarterKey_ };
})(GasShim.SpreadsheetApp, GasShim.Session, GasShim.LockService, GasShim.MailApp, GasShim.Utilities, GasShim.ScriptApp, GasShim.AdminDirectory, GasShim.HtmlService);
