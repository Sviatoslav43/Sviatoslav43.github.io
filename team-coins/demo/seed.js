/* Sample data for the demo. All names are fictional. */
(function () {
  const B = window.__backend;
  const ss = GasShim.SpreadsheetApp.getActiveSpreadsheet();
  B.setup();

  const ME = GasShim.DEMO_EMAIL;
  const people = [
    [ME, 'Alex Demo', 340],
    ['olena.koval@yourcompany.com', 'Olena Koval', 520],
    ['maksym.bondar@yourcompany.com', 'Maksym Bondar', 210],
    ['iryna.shevchuk@yourcompany.com', 'Iryna Shevchuk', 690],
    ['dmytro.lysenko@yourcompany.com', 'Dmytro Lysenko', 150],
    ['sofiia.tkachenko@yourcompany.com', 'Sofiia Tkachenko', 380],
    ['andrii.moroz@yourcompany.com', 'Andrii Moroz', 95],
  ];
  const name = e => people.find(p => p[0] === e)[1];
  const [olena, maksym, iryna, dmytro, sofiia, andrii] = people.slice(1).map(p => p[0]);

  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const thisMonth = d => new Date(y, m, Math.max(1, Math.min(d, now.getDate())), 11, 0);
  const monthsAgo = (k, d) => new Date(y, m - k, d, 11, 0);
  const monthKey = y + '-' + (m + 1);

  const sh = n => ss.getSheetByName(n);

  people.forEach(p => sh('Balances').appendRow([p[0], p[1], p[2], p[0] === ME ? 2 : 3, monthKey]));
  sh('Admins').appendRow([ME, 'hr@yourcompany.com', monthsAgo(3, 1)]);
  sh('Managers').appendRow([maksym, ME, monthsAgo(3, 1)]);

  const kudos = (ts, from, to, msg) => sh('KudosLog').appendRow([ts, from, name(from), to, name(to), msg]);
  kudos(monthsAgo(3, 12), olena, ME, 'Thanks for organising the hiring sprint so smoothly');
  kudos(monthsAgo(2, 8), dmytro, ME, 'You found us a great QA engineer in two weeks');
  kudos(monthsAgo(1, 15), sofiia, ME, 'Thank you for the onboarding checklist, it saved me days');
  kudos(thisMonth(3), olena, ME, 'Thanks for jumping on the candidate call at short notice');
  kudos(thisMonth(4), iryna, ME, 'Great English club session, everyone loved it');
  kudos(thisMonth(5), ME, dmytro, 'Thanks for the quick tech interview feedback');
  kudos(thisMonth(2), olena, iryna, 'Your webinar brought us three new leads');
  kudos(thisMonth(3), sofiia, iryna, 'Thank you for helping with the quarterly report');
  kudos(thisMonth(4), andrii, iryna, 'Best mentor on the team');
  kudos(thisMonth(5), maksym, olena, 'Thanks for covering my support shift');
  kudos(thisMonth(6), dmytro, sofiia, 'Thanks for the clear product brief');

  const sub = (ts, email, catId, label, coins, proof, status) =>
    sh('Submissions').appendRow([GasShim.Utilities.getUuid(), ts, email, name(email), catId, label, coins, proof, status,
      status === 'Pending' ? '' : ME, status === 'Pending' ? '' : ts]);
  sub(monthsAgo(1, 9), ME, 'li_trainee_profile', '💼 LinkedIn Trainee: оформити профіль', 30, 'linkedin.com/in/alex-demo', 'Approved');
  sub(thisMonth(2), ME, 'linkedin_post', '💼 LinkedIn-пост зі згадкою компанії', 20, 'Post about our new office opening', 'Approved');
  sub(thisMonth(6), ME, 'skill_sharing', '🧠 Skill Sharing для компанії', 60, 'Talk: how we run structured interviews', 'Pending');
  sub(thisMonth(3), iryna, 'english_club', '🗣️ Провести English Speaking Club', 40, 'Session on Thursday, 9 people', 'Approved');
  sub(thisMonth(4), iryna, 'speaking', '🎤 Виступ від компанії (meetup/webinar/podcast)', 100, 'Webinar on email outreach, recording link', 'Approved');
  sub(thisMonth(5), olena, 'speaking', '🎤 Виступ від компанії (meetup/webinar/podcast)', 100, 'Talk at a local product meetup, agreed with lead and HR', 'Pending');
  sub(thisMonth(6), sofiia, 'organize_activity', '🎉 Організація внутрішньої активності/клубу', 40, 'Board games evening, 8 people', 'Pending');
  sub(thisMonth(2), dmytro, 'digest', '📰 Стаття в дайджест', 15, 'Draft without a link', 'Rejected');

  const camp = (group, groupEn, title, titleEn, coins, hint, hintEn) => sh('CampaignCategories').appendRow([
    GasShim.Utilities.getUuid(), group.toLowerCase(), group, groupEn, title, titleEn, coins, hint, hintEn, true]);
  camp('Маркетинг', 'Marketing', 'Написати кейс клієнта', 'Write a customer case study', 50, 'Посилання на чернетку', 'Link to the draft');
  camp('HR', 'HR', 'Рекомендувати кандидата, якого найняли', 'Refer a candidate who gets hired', 150, 'Ім\u2019я кандидата і вакансія', 'Candidate name and vacancy');

  sh('Orders').appendRow([monthsAgo(1, 20), ME, name(ME), 'mug', 'Брендована чашка', 150]);
  sh('Orders').appendRow([monthsAgo(1, 22), olena, name(olena), 'book', 'Книга на вибір (до $10)', 200]);
  sh('Orders').appendRow([thisMonth(4), iryna, name(iryna), 'cert50', 'Сертифікат $50', 600]);

  sh('SecretCoinLog').appendRow([thisMonth(3), maksym, iryna, name(iryna), 40, 'Stayed late to fix the release', B.quarterKey_(now)]);

  sh('Suggestions').appendRow([GasShim.Utilities.getUuid(), thisMonth(5), sofiia, name(sofiia), 'Could we add a reward for mentoring new hires?', 'New']);
  sh('Suggestions').appendRow([GasShim.Utilities.getUuid(), monthsAgo(1, 3), andrii, name(andrii), 'A Ukrainian/English switch would be great.', 'Read']);

  people.forEach(p => sh('AchievementsLog').appendRow([monthsAgo(3, 1), p[0], p[1], 'start', 20]));
})();
