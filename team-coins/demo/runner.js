/*
 * Replaces google.script.run so the unchanged frontend talks to the
 * in-browser backend instead of Google's servers.
 */
(function () {
  const NOTE = {
    ua: 'Демо з вигаданими даними. Ви увійшли як адмін, тож відкриті всі сторінки. Зміни скидаються після перезавантаження.',
    en: 'Demo with sample data. You are signed in as an admin, so every page is open. Changes reset when you reload.',
  };

  function makeRunner(handlers) {
    return new Proxy({}, {
      get(_, prop) {
        if (prop === 'withSuccessHandler') return fn => makeRunner(Object.assign({}, handlers, { ok: fn }));
        if (prop === 'withFailureHandler') return fn => makeRunner(Object.assign({}, handlers, { fail: fn }));
        return function () {
          const args = Array.prototype.slice.call(arguments);
          setTimeout(function () {
            try {
              let res = window.__backend[prop].apply(null, args);
              if (res !== undefined) res = JSON.parse(JSON.stringify(res));
              if (res && typeof res === 'object' && 'balance' in res) {
                const lang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'ua';
                res.announcement = NOTE[lang];
              }
              if (handlers.ok) handlers.ok(res);
            } catch (e) {
              if (handlers.fail) handlers.fail(e);
              else console.error(e);
            }
          }, 200);
        };
      },
    });
  }

  window.google = { script: { run: makeRunner({}) } };
  window.DEMO_NOTE = NOTE;

  // Open the demo in English unless the visitor already picked a language.
  try { if (!localStorage.getItem('teamcoins_lang')) localStorage.setItem('teamcoins_lang', 'en'); } catch (e) {}
})();
