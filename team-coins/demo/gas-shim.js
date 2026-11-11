/*
 * In-browser stand-ins for the Google Apps Script services that Code.gs uses
 * (SpreadsheetApp, Session, LockService, MailApp, Utilities, ScriptApp,
 * AdminDirectory). Data lives in memory, so the demo resets on reload.
 * This lets the demo run the real, unchanged backend code.
 */
(function () {
  const DEMO_EMAIL = 'alex.demo@yourcompany.com';

  class Range {
    constructor(sheet, row, col, numRows, numCols) {
      this.sheet = sheet; this.row = row; this.col = col;
      this.numRows = numRows || 1; this.numCols = numCols || 1;
    }
    _ensureRow(r) { while (this.sheet.rows.length < r) this.sheet.rows.push([]); }
    getValue() {
      const r = this.sheet.rows[this.row - 1] || [];
      const v = r[this.col - 1];
      return v === undefined ? '' : v;
    }
    setValue(v) { this._ensureRow(this.row); this.sheet.rows[this.row - 1][this.col - 1] = v; return this; }
    getValues() {
      const out = [];
      for (let i = 0; i < this.numRows; i++) {
        const r = this.sheet.rows[this.row - 1 + i] || [];
        const line = [];
        for (let j = 0; j < this.numCols; j++) { const v = r[this.col - 1 + j]; line.push(v === undefined ? '' : v); }
        out.push(line);
      }
      return out;
    }
    setNumberFormat() { return this; }
  }

  class Sheet {
    constructor(name) { this.name = name; this.rows = []; }
    appendRow(values) { this.rows.push(values.slice()); return this; }
    setFrozenRows() { return this; }
    getLastRow() { return this.rows.length; }
    deleteRow(i) { this.rows.splice(i - 1, 1); }
    getDataRange() { const self = this; return { getValues() { return self.rows.map(r => r.slice()); } }; }
    getRange(a, b, c, d) {
      if (typeof a === 'string') return { setNumberFormat() { return this; } };
      return new Range(this, a, b, c, d);
    }
  }

  const sheets = {};
  const spreadsheet = {
    getSheetByName(name) { return sheets[name] || null; },
    insertSheet(name) { sheets[name] = new Sheet(name); return sheets[name]; },
  };

  window.GasShim = {
    DEMO_EMAIL,
    SpreadsheetApp: { getActiveSpreadsheet() { return spreadsheet; } },
    Session: { getActiveUser() { return { getEmail() { return DEMO_EMAIL; } }; } },
    LockService: { getScriptLock() { return { waitLock() {}, releaseLock() {} }; } },
    MailApp: { sendEmail() { /* emails are switched off in the demo */ } },
    Utilities: {
      getUuid() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      },
    },
    ScriptApp: { getService() { return { getUrl() { return ''; } }; } },
    AdminDirectory: { Users: { get() { throw new Error('Directory is not available in the demo'); } } },
    HtmlService: {},
  };
})();
