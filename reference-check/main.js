/* ═══════════════════════════════════════════
   HR Reference Form · main.js
═══════════════════════════════════════════ */

// ─── TOGGLE QUESTIONS ────────────────────────────────────────────────────────
document.querySelectorAll('.toggle-item').forEach(item => {
  item.addEventListener('click', function (e) {
    if (e.target.tagName === 'INPUT') return;
    const cb = this.querySelector('input[type=checkbox]');
    cb.checked = !cb.checked;
    updateToggle(this);
    updateCounter(this.dataset.group);
  });
  item.querySelector('input').addEventListener('change', function () {
    updateToggle(item);
    updateCounter(item.dataset.group);
  });
});

function updateToggle(el) {
  el.classList.toggle('on', el.querySelector('input').checked);
}

function updateCounter(group) {
  if (group === 'closed') {
    document.getElementById('closed-count').textContent =
      document.querySelectorAll('#closed-group input:checked').length;
  } else {
    document.getElementById('open-count').textContent =
      document.querySelectorAll('#open-group input:checked').length;
  }
}

// ─── ADD CUSTOM QUESTION ─────────────────────────────────────────────────────
function addCustomQuestion(groupId, counterId, type) {
  const q = prompt('Введіть текст питання:');
  if (!q || !q.trim()) return;
  const label = document.createElement('label');
  label.className = 'toggle-item on' + (type === 'open' ? ' pink-mode' : '');
  label.dataset.group = type;
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = true;
  const wrap = document.createElement('div');
  const lbl = document.createElement('div'); lbl.className = 'toggle-label';    lbl.textContent = q.trim();
  const sub = document.createElement('div'); sub.className = 'toggle-sublabel'; sub.textContent = 'Ваше питання';
  wrap.appendChild(lbl); wrap.appendChild(sub);
  label.appendChild(cb); label.appendChild(wrap);
  label.addEventListener('click', function (e) {
    if (e.target.tagName === 'INPUT') return;
    cb.checked = !cb.checked;
    updateToggle(this);
    updateCounter(type);
  });
  cb.addEventListener('change', () => { updateToggle(label); updateCounter(type); });
  document.getElementById(groupId).appendChild(label);
  updateCounter(type);
}

// ─── GENERATE LINK ───────────────────────────────────────────────────────────
function generateLink() {
  const candName = document.getElementById('cand-name').value.trim();
  const candRole = document.getElementById('cand-role').value.trim();
  const recName  = document.getElementById('rec-name').value.trim();
  const recTg    = document.getElementById('rec-tg').value.trim().replace(/^@/, '');
  const refName  = document.getElementById('ref-name').value.trim();
  const refComp  = document.getElementById('ref-company').value.trim();
  const relation = document.getElementById('ref-relation').value;

  if (!candName || !candRole || !recName || !recTg || !refName || !refComp || !relation) {
    alert("Будь ласка, заповніть усі обов'язкові поля (*)");
    return;
  }
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(recTg)) {
    alert('Telegram username: тільки латинські літери, цифри та _, від 5 до 32 символів');
    return;
  }

  const closedQs = [];
  document.querySelectorAll('#closed-group .toggle-item').forEach(item => {
    if (item.querySelector('input').checked)
      closedQs.push(item.querySelector('.toggle-label').textContent.trim());
  });
  const openQs = [];
  document.querySelectorAll('#open-group .toggle-item').forEach(item => {
    if (item.querySelector('input').checked)
      openQs.push(item.querySelector('.toggle-label').textContent.trim());
  });

  const fromYear  = document.getElementById('from-year').value;
  const fromMonth = document.getElementById('from-month').value;
  const toYear    = document.getElementById('to-year').value;
  const toMonth   = document.getElementById('to-month').value;

  const data = {
    cn: candName,
    cr: candRole,
    rn: recName,
    rc: document.getElementById('rec-company').value.trim(),
    rt: recTg,
    rm: document.getElementById('rec-msg').value.trim(),
    fn: refName,
    fc: refComp,
    fr: relation,
    pf: (fromYear && fromMonth) ? fromYear + '-' + fromMonth : '',
    pt: (toYear && toMonth)     ? toYear   + '-' + toMonth   : '',
    cq: closedQs,
    oq: openQs
  };

  const json    = JSON.stringify(data);
  const bytes   = new TextEncoder().encode(json);
  let binary    = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  const encoded = btoa(binary);
  const base    = window.location.href.split('#')[0].split('?')[0];
  const url     = base + '#r=' + encoded;

  document.getElementById('gen-link-text').textContent = url;
  const rb = document.getElementById('result-block');
  rb.classList.add('show');
  rb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── COPY LINK ───────────────────────────────────────────────────────────────
function copyLink() {
  const url = document.getElementById('gen-link-text').textContent;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector('.btn-copy');
    btn.textContent = '✓ Скопійовано';
    btn.style.background = '#059669';
    setTimeout(() => { btn.textContent = 'Копіювати'; btn.style.background = ''; }, 2000);
  });
}

// ─── SEND TO TELEGRAM (RECRUITER) ────────────────────────────────────────────
function sendToTelegram() {
  const tg  = document.getElementById('rec-tg').value.trim().replace(/^@/, '');
  const url = document.getElementById('gen-link-text').textContent;
  const cn  = document.getElementById('cand-name').value.trim();
  const msg = 'Привіт! Прошу заповнити форму рекомендації для ' + cn + '. Займе ~5 хвилин:\n' + url;
  showTgModal(tg, msg);
}

// ─── TELEGRAM MODAL ──────────────────────────────────────────────────────────
function showTgModal(tg, msg) {
  document.getElementById('tg-modal-text').textContent = msg;
  document.getElementById('tg-modal-overlay').classList.add('show');
  window._tgModalTg  = tg;
  window._tgModalMsg = msg;
}
function closeTgModal() {
  document.getElementById('tg-modal-overlay').classList.remove('show');
}
function tgModalCopy() {
  navigator.clipboard.writeText(window._tgModalMsg || '').then(() => {
    const btn = document.getElementById('tg-copy-btn');
    btn.textContent = '✓ Скопійовано!';
    btn.style.background = '#059669';
    setTimeout(() => { btn.textContent = '📋 Скопіювати повідомлення'; btn.style.background = ''; }, 2500);
  });
}
function tgModalOpen() {
  const tg = window._tgModalTg || '';
  navigator.clipboard.writeText(window._tgModalMsg || '').catch(() => {});
  if (tg && /^[a-zA-Z0-9_]{5,32}$/.test(tg)) {
    window.open('https://t.me/' + tg, '_blank');
  } else {
    window.open('https://t.me/', '_blank');
  }
}

// ─── PERIOD DATE PICKERS ──────────────────────────────────────────────────────
const MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];

function initPeriodPickers() {
  const cur = new Date().getFullYear();
  ['from-year','to-year'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    for (let y = cur; y >= 2000; y--) {
      const o = document.createElement('option');
      o.value = y; o.textContent = y;
      sel.appendChild(o);
    }
  });
  ['from-month','to-month'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    MONTHS.forEach((m, i) => {
      const o = document.createElement('option');
      o.value = String(i + 1).padStart(2, '0');
      o.textContent = m;
      sel.appendChild(o);
    });
  });
}

function onYearChange(prefix) {
  const yearSel  = document.getElementById(prefix + '-year');
  const monthSel = document.getElementById(prefix + '-month');
  if (yearSel.value) {
    monthSel.disabled = false;
    monthSel.focus();
  } else {
    monthSel.disabled = true;
    monthSel.value = '';
  }
}

// ─── REFERENCE MODE INIT ─────────────────────────────────────────────────────
function initRefMode() {
  const hash  = window.location.hash;
  const match = hash.match(/^#r=(.+)$/);
  if (!match) return;

  const r = match[1];
  let data;
  try {
    if (r.length > 20000) throw new Error('payload too large');
    const binary = atob(r);
    const bytes  = Uint8Array.from(binary, c => c.charCodeAt(0));
    data = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid shape');
    if (data.cq && data.cq.length > 30) data.cq = data.cq.slice(0, 30);
    if (data.oq && data.oq.length > 30) data.oq = data.oq.slice(0, 30);
    ['cn','cr','rn','rc','rt','rm','fn','fc','fr','pf','pt'].forEach(k => {
      if (typeof data[k] === 'string') data[k] = data[k].slice(0, 500);
    });
  } catch (e) { console.error('decode error', e); return; }

  document.getElementById('recruiter-mode').classList.add('hide');
  document.getElementById('ref-mode').classList.add('show');

  const initials = (data.cn || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('ref-avatar').textContent    = initials || '👤';
  document.getElementById('ref-cand-name').textContent = data.cn || '';
  document.getElementById('ref-cand-role').textContent = data.cr || '';

  const chips = document.getElementById('ref-chips');
  const addChip = (text, cls = '') => {
    const c = document.createElement('div');
    c.className = 'ref-chip ' + cls;
    c.textContent = text;
    chips.appendChild(c);
  };
  if (data.fn) addChip(data.fn);
  if (data.fc) addChip(data.fc, 'cyan');
  if (data.fr) addChip(data.fr, 'pink');
  if (data.pf || data.pt) addChip((data.pf || '?') + ' – ' + (data.pt || 'до сьогодні'));

  if (data.rm) {
    const pm = document.getElementById('ref-personal-msg');
    pm.textContent = '💬 ' + data.rm;
    pm.classList.remove('hidden');
  }

  // Closed questions
  const cqCont = document.getElementById('ref-closed-questions');
  if (data.cq && data.cq.length) {
    data.cq.forEach((q, i) => {
      const div   = document.createElement('div'); div.className = 'rating-question';
      const qText = document.createElement('div'); qText.className = 'q-text'; qText.textContent = q;
      const stars = document.createElement('div'); stars.className = 'stars'; stars.id = 'stars-' + i;
      [1,2,3,4,5].forEach(n => {
        const s = document.createElement('div');
        s.className = 'star'; s.dataset.q = i; s.dataset.val = n; s.textContent = n;
        s.addEventListener('click', () => setStar(i, n));
        stars.appendChild(s);
      });
      const lbl = document.createElement('div'); lbl.className = 'star-label'; lbl.id = 'star-lbl-' + i; lbl.textContent = 'Оберіть оцінку';
      div.appendChild(qText); div.appendChild(stars); div.appendChild(lbl);
      cqCont.appendChild(div);
    });
  } else {
    document.getElementById('ref-closed-section').style.display = 'none';
  }

  // Open questions
  const oqCont = document.getElementById('ref-open-questions');
  if (data.oq && data.oq.length) {
    data.oq.forEach((q, i) => {
      const div   = document.createElement('div'); div.className = 'open-question';
      const qText = document.createElement('div'); qText.className = 'q-text'; qText.textContent = q;
      const ta    = document.createElement('textarea');
      ta.id = 'open-ans-' + i; ta.placeholder = 'Ваша відповідь...'; ta.style.minHeight = '88px';
      div.appendChild(qText); div.appendChild(ta);
      oqCont.appendChild(div);
    });
  } else {
    document.getElementById('ref-open-section').style.display = 'none';
  }

  window._refData = data;
}

// ─── STAR RATING ─────────────────────────────────────────────────────────────
const starLabels = ['','Значно нижче очікувань','Нижче очікувань','На очікуваному рівні','Вище очікувань','Значно перевершує очікування'];

function setStar(qIdx, val) {
  document.querySelectorAll('.star[data-q="' + qIdx + '"]').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= val);
  });
  const lbl = document.getElementById('star-lbl-' + qIdx);
  if (lbl) lbl.textContent = val + '/5 — ' + starLabels[val];
  if (!window._starVals) window._starVals = {};
  window._starVals[qIdx] = val;
}

// ─── COLLECT RESULTS ─────────────────────────────────────────────────────────
function collectResults() {
  const d = window._refData || {};
  const ctType   = (document.getElementById('ref-contact-type')  || {}).value || '';
  const ctValue  = (document.getElementById('ref-contact-value') || {}).value || '';
  const ctPrefix = ctType === 'telegram' ? '@' : ctType === 'linkedin' ? 'linkedin.com/in/' : '';
  const ctLabel  = { telegram: 'Telegram', email: 'Email', linkedin: 'LinkedIn' }[ctType] || '';

  let text = '📋 РЕКОМЕНДАЦІЯ\n━━━━━━━━━━━━━━━━━━━━━━━━\n';
  text += '👤 Кандидат: ' + (d.cn || '') + ', ' + (d.cr || '') + '\n';
  text += '👥 Від: ' + (d.fn || '') + ', ' + (d.fc || '') + '\n';
  text += "🔗 Зв'язок: " + (d.fr || '') + '\n';
  if (d.pf || d.pt) text += '📅 Період: ' + (d.pf || '?') + ' – ' + (d.pt || 'до сьогодні') + '\n';
  if (ctValue) text += '📬 Контакт: ' + ctLabel + ' ' + ctPrefix + ctValue + '\n';
  text += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  if (d.cq && d.cq.length) {
    text += '⭐ ОЦІНКИ (1–5)\n\n';
    d.cq.forEach((q, i) => {
      const val = window._starVals && window._starVals[i] ? window._starVals[i] : '—';
      text += q + '\n→ ' + val + '/5 (' + (val !== '—' ? starLabels[val] : 'не оцінено') + ')\n\n';
    });
  }
  if (d.oq && d.oq.length) {
    text += '💬 ВІДПОВІДІ\n\n';
    d.oq.forEach((q, i) => {
      const ans = (document.getElementById('open-ans-' + i) || {}).value || '—';
      text += q + '\n→ ' + ans + '\n\n';
    });
  }
  text += '━━━━━━━━━━━━━━━━━━━━━━━━\nНадіслано через HR Reference Form';
  return text;
}

// ─── VALIDATE REFERENCE FORM ─────────────────────────────────────────────────
function validateRefForm() {
  const d = window._refData || {};
  const errors = [];

  if (d.cq && d.cq.length) {
    d.cq.forEach((q, i) => {
      if (!window._starVals || !window._starVals[i])
        errors.push('Оцініть: «' + q.slice(0, 50) + '»');
    });
  }
  if (d.oq && d.oq.length) {
    d.oq.forEach((q, i) => {
      const ta = document.getElementById('open-ans-' + i);
      if (!ta || !ta.value.trim())
        errors.push('Дайте відповідь: «' + q.slice(0, 50) + '»');
    });
  }
  const contact = document.getElementById('ref-contact-value');
  if (!contact || !contact.value.trim())
    errors.push('Вкажіть ваш контакт (Telegram, Email або LinkedIn)');

  if (errors.length) {
    alert('Будь ласка, заповніть:\n\n• ' + errors.join('\n• '));
    return false;
  }
  return true;
}

// ─── SUBMIT TO TELEGRAM (REFEREE) ────────────────────────────────────────────
function submitToTelegram() {
  if (!validateRefForm()) return;
  const d     = window._refData || {};
  const rawTg = (d.rt || '').trim().replace(/^@/, '');
  if (!rawTg || !/^[a-zA-Z0-9_]{5,32}$/.test(rawTg)) {
    alert('Не вдалося визначити Telegram рекрутера. Скористайтесь завантаженням PDF.');
    return;
  }
  showTgModal(rawTg, collectResults());
}

// ─── DOWNLOAD PDF ─────────────────────────────────────────────────────────────
function downloadPDF() {
  if (!validateRefForm()) return;
  const { jsPDF } = window.jspdf;
  if (!jsPDF || !window.html2canvas) {
    alert('Бібліотеки ще завантажуються, спробуйте за секунду');
    return;
  }

  const d       = window._refData || {};
  const ctType  = (document.getElementById('ref-contact-type')  || {}).value || '';
  const ctValue = (document.getElementById('ref-contact-value') || {}).value || '';
  const ctPfx   = ctType === 'telegram' ? '@' : ctType === 'linkedin' ? 'linkedin.com/in/' : '';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:680px;padding:40px 48px;font-family:Arial,sans-serif;font-size:13px;color:#1e1b4b;background:#fff;line-height:1.6;position:fixed;left:-9999px;top:0;';

  const hdr = el('div','background:#7c3aed;border-radius:12px;padding:24px 28px;margin-bottom:24px;');
  const ht  = el('div','font-size:20px;font-weight:900;color:#fff;margin-bottom:4px;'); ht.textContent = 'Форма рекомендації';
  const hs  = el('div','font-size:13px;color:#ddd6fe;'); hs.textContent = 'Кандидат: ' + (d.cn||'') + ' · ' + (d.cr||'');
  hdr.appendChild(ht); hdr.appendChild(hs); wrap.appendChild(hdr);

  const info = el('div','background:#f5f0ff;border-radius:10px;padding:16px 20px;margin-bottom:20px;');
  [
    ['Кандидат',          (d.cn||'') + ', ' + (d.cr||'')],
    ['Референт',          (d.fn||'') + ', ' + (d.fc||'')],
    ["Зв'язок",           d.fr||''],
    ['Період',            (d.pf||d.pt) ? (d.pf||'?')+' – '+(d.pt||'до сьогодні') : ''],
    ['Рекрутер',          d.rt ? '@'+d.rt : ''],
    ['Контакт референта', ctValue ? ctPfx+ctValue : ''],
  ].forEach(([lbl, val]) => {
    if (!val) return;
    const row = el('div','display:flex;gap:8px;margin-bottom:6px;');
    const l = el('span','color:#7c3aed;font-weight:700;min-width:130px;flex-shrink:0;'); l.textContent = lbl+':';
    const v = el('span','color:#1e1b4b;'); v.textContent = val;
    row.appendChild(l); row.appendChild(v); info.appendChild(row);
  });
  wrap.appendChild(info);

  if (d.cq && d.cq.length) {
    const sec  = el('div','margin-bottom:20px;');
    const stit = el('div','font-size:15px;font-weight:900;color:#7c3aed;margin-bottom:12px;border-bottom:2px solid #ede9fe;padding-bottom:8px;page-break-after:avoid;break-after:avoid;');
    stit.textContent = 'Оцінки компетенцій (1–5)'; sec.appendChild(stit);
    d.cq.forEach((q, i) => {
      const val   = window._starVals && window._starVals[i] ? window._starVals[i] : null;
      const row   = el('div','display:flex;justify-content:space-between;align-items:flex-start;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;margin-bottom:8px;gap:12px;page-break-inside:avoid;break-inside:avoid;');
      const qt    = el('div','flex:1;font-size:13px;'); qt.textContent = q;
      const badge = el('div','min-width:60px;text-align:center;padding:4px 10px;border-radius:20px;font-weight:900;font-size:13px;background:'+(val?'#7c3aed':'#f3f4f6')+';color:'+(val?'#fff':'#9ca3af')+';');
      badge.textContent = val ? val+' / 5' : '—';
      row.appendChild(qt); row.appendChild(badge); sec.appendChild(row);
    });
    wrap.appendChild(sec);
  }

  if (d.oq && d.oq.length) {
    const sec2  = el('div','margin-bottom:20px;');
    const stit2 = el('div','font-size:15px;font-weight:900;color:#ec4899;margin-bottom:12px;border-bottom:2px solid #fce7f3;padding-bottom:8px;page-break-after:avoid;break-after:avoid;');
    stit2.textContent = 'Відповіді на відкриті питання'; sec2.appendChild(stit2);
    d.oq.forEach((q, i) => {
      const ans   = (document.getElementById('open-ans-'+i)||{}).value||'—';
      const block = el('div','margin-bottom:14px;padding:12px 16px;border:1.5px solid #e5e7eb;border-radius:8px;page-break-inside:avoid;break-inside:avoid;');
      const ql    = el('div','font-weight:700;margin-bottom:6px;font-size:13px;'); ql.textContent = q;
      const at    = el('div','font-size:13px;white-space:pre-wrap;line-height:1.6;color:#374151;'); at.textContent = ans;
      block.appendChild(ql); block.appendChild(at); sec2.appendChild(block);
    });
    wrap.appendChild(sec2);
  }

  const foot = el('div','margin-top:20px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;');
  foot.textContent = 'Сформовано: ' + new Date().toLocaleDateString('uk-UA') + ' · HR Reference Form';
  wrap.appendChild(foot);
  document.body.appendChild(wrap);

  html2canvas(wrap, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
    .then(canvas => {
      document.body.removeChild(wrap);
      const doc     = new jsPDF({ unit: 'mm', format: 'a4' });
      const imgW    = 210;
      const imgH    = (canvas.height * imgW) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      doc.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
      let left = imgH - 297, pos = -297;
      while (left > 0) { doc.addPage(); doc.addImage(imgData,'JPEG',0,pos,imgW,imgH); left-=297; pos-=297; }
      doc.save('recommendation_' + (d.cn||'candidate').replace(/\s+/g,'_') + '.pdf');
      showSuccess('PDF завантажено! Надішліть файл рекрутеру зручним способом.');
    })
    .catch(err => { console.error(err); document.body.removeChild(wrap); alert('Не вдалося створити PDF.'); });
}

function el(tag, style) {
  const e = document.createElement(tag);
  e.style.cssText = style;
  return e;
}

// ─── SUCCESS ─────────────────────────────────────────────────────────────────
function showSuccess(msg) {
  ['submit-section','ref-closed-section','ref-open-section','ref-contact-card','ref-footer']
    .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  document.getElementById('success-msg').textContent = msg;
  const ss = document.getElementById('success-screen');
  ss.classList.add('show');
  ss.scrollIntoView({ behavior: 'smooth' });
}

// ─── CONTACT TYPE SWITCHER ────────────────────────────────────────────────────
function updateContactPlaceholder() {
  const type   = document.getElementById('ref-contact-type').value;
  const prefix = document.getElementById('ref-contact-prefix');
  const input  = document.getElementById('ref-contact-value');
  if (type === 'telegram') {
    prefix.textContent = '@'; prefix.style.display = '';
    input.placeholder = 'username'; input.type = 'text';
  } else if (type === 'email') {
    prefix.style.display = 'none';
    input.placeholder = 'example@email.com'; input.type = 'email';
  } else {
    prefix.textContent = 'in/'; prefix.style.display = '';
    input.placeholder = 'your-name'; input.type = 'text';
  }
  input.value = '';
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPeriodPickers();
  initRefMode();
  const overlay = document.getElementById('tg-modal-overlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeTgModal(); });
});
