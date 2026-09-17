import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');
const sharedSecret = 'offline-test-secret-with-at-least-32-characters';

function harness(options = {}) {
  const rows = options.rows ?? [];
  const calls = { sheets: 0, writes: 0, mails: [], lockReleases: 0 };
  const state = { ...options, cache: options.cachedCount ?? null };
  const properties = {
    SHARED_SECRET: sharedSecret,
    SPREADSHEET_ID: 'offline_spreadsheet_id_1234567890',
    ...options.properties,
  };
  const sheet = {
    getLastRow: () => rows.length,
    setFrozenRows: () => {},
    getRange: (start, column, rowCount, columnCount) => ({
      setNumberFormat() { return this; },
      setValues(values) {
        if (state.writeFails) throw new Error('private error test@example.com');
        calls.writes += 1;
        for (let index = 0; index < values.length; index += 1) {
          rows[start - 1 + index] = Array.from(values[index]);
        }
        return this;
      },
      setRichTextValues(values) {
        return this.setValues(values.map((row) => row.map((value) => value.text)));
      },
      getValues: () => Array.from({ length: rowCount }, (_, index) => {
        const row = rows[start - 1 + index] ?? [];
        return Array.from({ length: columnCount }, (_, offset) => row[column - 1 + offset] ?? '');
      }),
    }),
  };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => properties[key] ?? null }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => state.lockAvailable !== false,
        waitLock: () => {},
        releaseLock: () => { calls.lockReleases += 1; },
      }),
    },
    SpreadsheetApp: {
      newRichTextValue: () => ({
        setText(text) { this.text = text; return this; },
        build() { return { text: this.text }; },
      }),
      openById: () => {
        calls.sheets += 1;
        if (state.openFails) throw new Error('private error');
        return { getSheetByName: () => sheet, insertSheet: () => sheet };
      },
      flush: () => { if (state.flushFails) throw new Error('private error'); },
    },
    CacheService: {
      getScriptCache: () => ({
        get: () => state.cache,
        put: (_key, value) => {
          if (state.cacheWriteFails) throw new Error('private error');
          state.cache = value;
        },
      }),
    },
    MailApp: {
      getRemainingDailyQuota: () => state.mailQuota ?? 100,
      sendEmail: (message) => {
        if (state.mailFails) throw new Error('private error');
        calls.mails.push(message);
      },
    },
  });
  vm.runInContext(source, context);
  return { context, rows, calls, state };
}

function payload(overrides = {}) {
  return {
    secret: sharedSecret,
    submissionId: '123e4567-e89b-42d3-a456-426614174000',
    email: 'test@example.com',
    marketingConsent: true,
    consentVersion: 'marketing-email-v1-2026-09-15',
    testVersion: 'self-esteem-v1',
    submittedAt: '2026-09-17T12:00:00.000Z',
    ...overrides,
  };
}

function post(app, data = payload(), eventOverrides = {}) {
  const body = JSON.stringify(data);
  const result = app.context.doPost({
    contentLength: Buffer.byteLength(body),
    postData: { contents: body, type: 'application/json' },
    ...eventOverrides,
  });
  return JSON.parse(result.text);
}

test('acknowledges only stored rows and stores no score, answers, IP or secret', () => {
  const app = harness();
  assert.deepEqual(post(app), { ok: true });
  assert.equal(app.rows.length, 2);
  assert.equal(app.rows[1].length, 7);
  assert.equal(app.rows[1][0], 'test@example.com');
  assert.equal(app.rows[1][1], '2026-09-17T12:00:00.000Z');
  assert.equal(app.rows[1][2], 'TAK');
  assert.match(app.rows[1][4], /Zgodę mogę wycofać w każdej chwili\./);
  assert.equal(app.rows[1].includes(sharedSecret), false);
  assert.equal(app.calls.mails.length, 0);
  assert.equal(app.calls.lockReleases, 1);
});

test('durably deduplicates submission ID and email plus consent version', () => {
  const app = harness();
  assert.deepEqual(post(app), { ok: true });
  assert.deepEqual(post(app), { ok: true });
  assert.deepEqual(post(app, payload({ submissionId: '223e4567-e89b-42d3-a456-426614174000' })), { ok: true });
  assert.equal(app.rows.length, 2);
  assert.equal(app.state.cache, '1');
});

test('reused submission ID cannot silently acknowledge a different email or consent version', () => {
  const app = harness();
  assert.deepEqual(post(app), { ok: true });
  assert.deepEqual(post(app, payload({ email: 'other@example.com' })), { ok: false, error: 'unavailable' });
  assert.equal(app.rows.length, 2);
  assert.equal(app.state.cache, '1');
  app.rows[1][3] = 'previous-consent-version';
  assert.deepEqual(post(app), { ok: false, error: 'unavailable' });
  assert.equal(app.rows.length, 2);
});

test('acknowledges existing row at rate cap, rejects new contact at cap', () => {
  const app = harness();
  assert.deepEqual(post(app), { ok: true });
  app.state.cache = '120';
  assert.deepEqual(post(app), { ok: true });
  assert.deepEqual(post(app, payload({ email: 'other@example.com', submissionId: '223e4567-e89b-42d3-a456-426614174000' })), { ok: false, error: 'rate_limited' });
  assert.equal(app.rows.length, 2);
});

test('wrong or missing secret cannot open the spreadsheet', () => {
  for (const secret of [undefined, 'x'.repeat(40), sharedSecret + ' ']) {
    const app = harness();
    assert.equal(post(app, payload({ secret })).ok, false);
    assert.equal(app.calls.sheets, 0);
  }
  const app = harness({ properties: { SHARED_SECRET: 'short' } });
  assert.deepEqual(post(app), { ok: false, error: 'unavailable' });
  assert.equal(app.calls.sheets, 0);
});

test('rejects schema additions, missing consent, altered versions and invalid dates', () => {
  for (const changes of [
    { answers: [1, 2] }, { marketingConsent: false }, { marketingConsent: 'true' },
    { consentVersion: 'other' }, { testVersion: 'other' }, { submittedAt: '2026-02-30T12:00:00.000Z' },
    { submittedAt: '2026-09-17' }, { submissionId: 'not-a-uuid' },
  ]) {
    const app = harness();
    assert.deepEqual(post(app, payload(changes)), { ok: false, error: 'invalid_request' });
    assert.equal(app.calls.sheets, 0);
  }
});

test('rejects malformed JSON, MIME type and oversized request', () => {
  const app = harness();
  assert.equal(post(app, payload(), { postData: { contents: '{', type: 'application/json' } }).ok, false);
  assert.equal(post(app, payload(), { postData: { contents: JSON.stringify(payload()), type: 'text/plain' } }).ok, false);
  assert.equal(post(app, payload(), { contentLength: 4097 }).ok, false);
  assert.equal(post(app, null).ok, false);
  assert.equal(app.calls.sheets, 0);
});

test('email validation supports server domain formats and rejects invalid/local mixed case', () => {
  for (const email of ['normal@example.123', 'a+b@xn--example-9db.pl', 'a.b@example.com']) {
    assert.deepEqual(post(harness(), payload({ email })), { ok: true });
  }
  for (const email of ['Test@example.com', ' test@example.com', 'a..b@example.com', '.a@example.com', 'a.@example.com', 'a@-example.com', 'a@example-.com', 'a@example', 'a\n@example.com', 'a'.repeat(65) + '@example.com']) {
    assert.equal(post(harness(), payload({ email })).ok, false);
  }
});

test('neutralizes leading spreadsheet formula characters and retains dedupe', () => {
  for (const email of ['=formula@example.com', '+plus@example.com', '-minus@example.com', "'quoted@example.com"]) {
    const app = harness();
    assert.deepEqual(post(app, payload({ email })), { ok: true });
    assert.equal(app.rows[1][0], "'" + email);
    assert.deepEqual(post(app, payload({ email, submissionId: '223e4567-e89b-42d3-a456-426614174000' })), { ok: true });
    assert.equal(app.rows.length, 2);
  }
});

test('escaped formula-prefix address stays distinct from genuine leading apostrophe', () => {
  const app = harness();
  assert.deepEqual(post(app, payload({ email: '=formula@example.com' })), { ok: true });
  assert.deepEqual(post(app, payload({ email: "'=formula@example.com", submissionId: '223e4567-e89b-42d3-a456-426614174000' })), { ok: true });
  assert.equal(app.rows.length, 3);
  assert.equal(app.rows[1][0], "'=formula@example.com");
  assert.equal(app.rows[2][0], "''=formula@example.com");
});

test('notification is optional, goes only to owner, and contains no participant address', () => {
  const app = harness({ properties: { NOTIFICATION_EMAIL: 'smile@pracowniazycia.pl' } });
  assert.deepEqual(post(app), { ok: true });
  assert.equal(app.calls.mails.length, 1);
  assert.equal(app.calls.mails[0].to, 'smile@pracowniazycia.pl');
  assert.equal(app.calls.mails[0].body.includes('test@example.com'), false);
  assert.equal(app.calls.mails[0].body.includes(sharedSecret), false);
  assert.deepEqual(post(app), { ok: true });
  assert.equal(app.calls.mails.length, 1);
});

test('quota exhaustion or notification failure never invalidates committed row', () => {
  for (const settings of [{ mailQuota: 0 }, { mailFails: true }]) {
    const app = harness({ ...settings, properties: { NOTIFICATION_EMAIL: 'smile@pracowniazycia.pl' } });
    assert.deepEqual(post(app), { ok: true });
    assert.equal(app.rows.length, 2);
  }
});

test('failed cache update still acknowledges committed row', () => {
  const app = harness({ cacheWriteFails: true });
  assert.deepEqual(post(app), { ok: true });
  assert.equal(app.rows.length, 2);
});

test('write failure reports generic error and releases lock', () => {
  const app = harness({ writeFails: true });
  assert.deepEqual(post(app), { ok: false, error: 'unavailable' });
  assert.equal(app.rows.length, 0);
  assert.equal(app.calls.lockReleases, 1);
});

test('retry after interrupted flush recovers already stored lead without duplication', () => {
  const app = harness({ flushFails: true });
  assert.deepEqual(post(app), { ok: false, error: 'unavailable' });
  assert.equal(app.rows.length, 2);
  app.state.flushFails = false;
  assert.deepEqual(post(app), { ok: true });
  assert.equal(app.rows.length, 2);
});

test('lock conflict, unavailable sheet and unexpected headers fail closed', () => {
  assert.deepEqual(post(harness({ lockAvailable: false })), { ok: false, error: 'busy' });
  assert.deepEqual(post(harness({ openFails: true })), { ok: false, error: 'unavailable' });
  assert.deepEqual(post(harness({ rows: [['unrelated data']] })), { ok: false, error: 'unavailable' });
});

test('GET never opens sheet and never reveals configuration', () => {
  const app = harness();
  assert.deepEqual(JSON.parse(app.context.doGet().text), { ok: false, error: 'method_not_allowed' });
  assert.equal(app.calls.sheets, 0);
});

test('manual initialization creates only headers, without email or lead', () => {
  const app = harness({ properties: { NOTIFICATION_EMAIL: 'smile@pracowniazycia.pl' } });
  assert.match(app.context.initializeLeadSheet(), /Arkusz jest gotowy/);
  assert.equal(app.rows.length, 1);
  assert.equal(app.calls.mails.length, 0);
});
