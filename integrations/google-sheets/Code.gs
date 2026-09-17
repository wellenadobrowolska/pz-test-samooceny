/**
 * Temporary lead storage for Pracownia Życia.
 * Paste into a private, spreadsheet-bound Apps Script project.
 * Configure Script Properties; never put credentials in this source file.
 */
const LEAD_HEADERS = [
  'E-mail',
  'Data zapisu (UTC)',
  'Zgoda marketingowa',
  'Wersja zgody',
  'Treść zgody',
  'Wersja testu',
  'Identyfikator zgłoszenia',
];
const LEAD_CONSENT_VERSION = 'marketing-email-v1-2026-09-15';
const LEAD_TEST_VERSION = 'self-esteem-v1';
const LEAD_CONSENT_TEXT =
  'Wyrażam zgodę na otrzymywanie od Pracowni Życia drogą e-mail treści marketingowych zgodnie z Polityką prywatności. Zgodę mogę wycofać w każdej chwili.';
const LEAD_REQUEST_KEYS = [
  'secret', 'submissionId', 'email', 'marketingConsent',
  'consentVersion', 'testVersion', 'submittedAt',
];
const LEAD_MAX_REQUEST_BYTES = 4096;
const LEAD_MAX_SUCCESSFUL_SUBMISSIONS_PER_HOUR = 120;

/** GET never reads or reveals the sheet or configuration. */
function doGet() {
  return leadJson_({ ok: false, error: 'method_not_allowed' });
}

/** Only the Vercel server should invoke this endpoint. */
function doPost(event) {
  let lock;
  let locked = false;
  let committed = false;
  try {
    const request = leadRequest_(event);
    if (!request) return leadJson_({ ok: false, error: 'invalid_request' });

    const properties = PropertiesService.getScriptProperties();
    const secret = properties.getProperty('SHARED_SECRET');
    if (typeof secret !== 'string' || secret.length < 32 || secret.length > 256) {
      return leadJson_({ ok: false, error: 'unavailable' });
    }
    if (!leadSecretMatches_(request.secret, secret)) {
      return leadJson_({ ok: false, error: 'unauthorized' });
    }
    if (!leadValidPayload_(request)) {
      return leadJson_({ ok: false, error: 'invalid_request' });
    }

    lock = LockService.getScriptLock();
    locked = lock.tryLock(5000);
    if (!locked) return leadJson_({ ok: false, error: 'busy' });

    const sheet = leadSheet_(properties);
    if (leadDuplicate_(sheet, request)) {
      // A previous successful request remains acknowledged after retries.
      return leadJson_({ ok: true });
    }

    const cache = CacheService.getScriptCache();
    const rateKey = 'lead-success-hour-' + Math.floor(Date.now() / 3600000);
    const cachedCount = cache.get(rateKey);
    const successfulCount = cachedCount === null ? 0 : Number(cachedCount);
    if (!Number.isInteger(successfulCount) || successfulCount < 0) {
      return leadJson_({ ok: false, error: 'unavailable' });
    }
    if (successfulCount >= LEAD_MAX_SUCCESSFUL_SUBMISSIONS_PER_HOUR) {
      return leadJson_({ ok: false, error: 'rate_limited' });
    }

    const row = [
      request.email, request.submittedAt, 'TAK', request.consentVersion,
      LEAD_CONSENT_TEXT, request.testVersion, request.submissionId,
    ].map(leadSafeCell_);
    const target = sheet.getRange(sheet.getLastRow() + 1, 1, 1, LEAD_HEADERS.length);
    target.setNumberFormat('@');
    // Literal text preserves the protective prefix, including during CSV export.
    target.setRichTextValues([row.map(function (value) {
      return SpreadsheetApp.newRichTextValue().setText(value).build();
    })]);
    SpreadsheetApp.flush();
    // Confirm the stored identifier before acknowledging persistence.
    if (target.getValues()[0][6] !== request.submissionId) {
      return leadJson_({ ok: false, error: 'unavailable' });
    }
    committed = true;

    // A cache failure cannot undo a durable write or hide an existing result.
    try {
      cache.put(rateKey, String(successfulCount + 1), 3600);
    } catch (_) {
      // No request bodies, email addresses or credentials are logged.
    }

    lock.releaseLock();
    locked = false;
    leadNotify_(properties, request.submittedAt);
    return leadJson_({ ok: true });
  } catch (_) {
    // Never expose Apps Script exceptions, request fields or secrets.
    return leadJson_(committed ? { ok: true } : { ok: false, error: 'unavailable' });
  } finally {
    if (locked) {
      try { lock.releaseLock(); } catch (_) { /* Do not log user data. */ }
    }
  }
}

/** Run once from the Apps Script editor to authorize and prepare the sheet. */
function initializeLeadSheet() {
  const properties = PropertiesService.getScriptProperties();
  const secret = properties.getProperty('SHARED_SECRET');
  if (typeof secret !== 'string' || secret.length < 32 || secret.length > 256) {
    throw new Error('Ustaw SHARED_SECRET: od 32 do 256 znaków.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    leadSheet_(properties);
    SpreadsheetApp.flush();
    if (properties.getProperty('NOTIFICATION_EMAIL')) {
      // Requests authorization only; does not send a notification.
      MailApp.getRemainingDailyQuota();
    }
  } finally {
    lock.releaseLock();
  }
  return 'Arkusz jest gotowy. Nie wysłano żadnej wiadomości.';
}

function leadRequest_(event) {
  if (!event || !event.postData || typeof event.postData.contents !== 'string') return null;
  const body = event.postData.contents;
  const byteLength = Number(event.contentLength ?? event.postData.length);
  if (body.length === 0 || body.length > LEAD_MAX_REQUEST_BYTES ||
      !Number.isFinite(byteLength) || byteLength < 1 || byteLength > LEAD_MAX_REQUEST_BYTES ||
      !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(event.postData.type || '')) return null;
  let request;
  try { request = JSON.parse(body); } catch (_) { return null; }
  if (!request || typeof request !== 'object' || Array.isArray(request)) return null;
  const keys = Object.keys(request);
  if (keys.length !== LEAD_REQUEST_KEYS.length ||
      !keys.every(function (key) { return LEAD_REQUEST_KEYS.indexOf(key) !== -1; })) return null;
  if (typeof request.secret !== 'string' || request.secret.length < 32 || request.secret.length > 256) return null;
  return request;
}

function leadValidPayload_(request) {
  if (request.marketingConsent !== true || request.consentVersion !== LEAD_CONSENT_VERSION ||
      request.testVersion !== LEAD_TEST_VERSION || typeof request.submissionId !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(request.submissionId) ||
      !leadEmail_(request.email) || typeof request.submittedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(request.submittedAt)) return false;
  const timestamp = new Date(request.submittedAt);
  return !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === request.submittedAt;
}

function leadEmail_(email) {
  if (typeof email !== 'string' || email.length > 254 || email !== email.toLowerCase() ||
      email !== email.trim() || /[^\x21-\x7e]/.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2 || parts[0].length < 1 || parts[0].length > 64 ||
      !/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/.test(parts[0]) ||
      parts[0].startsWith('.') || parts[0].endsWith('.') || parts[0].includes('..')) return false;
  const labels = parts[1].split('.');
  return labels.length >= 2 && labels.every(function (label) {
    return label.length >= 1 && label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);
  });
}

function leadSecretMatches_(provided, expected) {
  let difference = provided.length ^ expected.length;
  for (let index = 0; index < Math.max(provided.length, expected.length); index += 1) {
    difference |= (provided.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function leadSheet_(properties) {
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  const sheetName = properties.getProperty('SHEET_NAME') || 'Zapisy';
  if (!spreadsheetId || !/^[a-zA-Z0-9_-]{20,200}$/.test(spreadsheetId) ||
      sheetName.length > 100 || /[\[\]:*?\/\\]/.test(sheetName)) {
    throw new Error('Nieprawidłowa konfiguracja arkusza.');
  }
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, LEAD_HEADERS.length).setValues([LEAD_HEADERS]);
    sheet.setFrozenRows(1);
  } else {
    const headers = sheet.getRange(1, 1, 1, LEAD_HEADERS.length).getValues()[0];
    if (!headers.every(function (header, index) { return header === LEAD_HEADERS[index]; })) {
      throw new Error('Nagłówki arkusza nie pasują.');
    }
  }
  return sheet;
}

function leadDuplicate_(sheet, request) {
  const count = sheet.getLastRow() - 1;
  if (count < 1) return false;
  const existing = sheet.getRange(2, 1, count, LEAD_HEADERS.length).getValues();
  let duplicate = false;
  existing.forEach(function (row) {
    const storedEmail = String(row[0]).replace(/^'(?=[=+\-@\t\r\n'])/, '');
    const sameContact = storedEmail === request.email && row[3] === request.consentVersion;
    const sameSubmission = String(row[6]).toLowerCase() === request.submissionId.toLowerCase();
    if (sameSubmission && !sameContact) {
      // A reused identifier must never silently acknowledge a different contact.
      throw new Error('Konflikt identyfikatora zgłoszenia.');
    }
    if (sameContact) duplicate = true;
  });
  return duplicate;
}

function leadSafeCell_(value) {
  // Force text and neutralize common spreadsheet/CSV formula prefixes.
  // Escape a leading quote too, keeping this transformation reversible.
  return /^[=+\-@\t\r\n']/.test(value) ? "'" + value : value;
}

function leadNotify_(properties, submittedAt) {
  try {
    const recipient = properties.getProperty('NOTIFICATION_EMAIL');
    if (!recipient || !leadEmail_(recipient) || MailApp.getRemainingDailyQuota() < 1) return;
    MailApp.sendEmail({
      to: recipient,
      subject: 'Nowy zapis z testu samooceny — Pracownia Życia',
      body: 'Nowy adres e-mail został zapisany w prywatnym arkuszu.\n' +
        'Data zapisu (UTC): ' + submittedAt + '\n\n' +
        'Otwórz arkusz: https://docs.google.com/spreadsheets/d/' + properties.getProperty('SPREADSHEET_ID') + '/edit\n\n' +
        'Ta wiadomość nie zawiera odpowiedzi ani wyniku testu. Wynik nie jest wysyłany uczestniczce.',
      name: 'Test samooceny — Pracownia Życia',
    });
  } catch (_) {
    // Quota, delivery and authorization failures never invalidate a stored row.
  }
}

function leadJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
