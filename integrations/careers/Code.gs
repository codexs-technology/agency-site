/* Deploy only after owner review. Never log e, payload, secrets or attachments. */
function reply_(reference, state, code) {
  return ContentService.createTextOutput(JSON.stringify({
    version: 1, reference: reference, ok: state === 'sent', state: state, code: code
  })).setMimeType(ContentService.MimeType.JSON);
}

function equalSecret_(a, b) {
  var x = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(a));
  var y = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(b));
  var diff = 0;
  for (var i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function doPost(e) {
  var p;
  try {
    if (!e || !e.postData || e.postData.contents.length > 4300000) return reply_('', 'failed', 'invalid');
    p = JSON.parse(e.postData.contents);
  } catch (_) { return reply_('', 'failed', 'invalid'); }
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('CAREERS_WEBHOOK_SECRET');
  if (!secret || secret.length < 32 || !equalSecret_(p.secret || '', secret))
    return reply_('', 'failed', 'unauthorized');
  if (p.version !== 1 || !/^[a-f0-9]{64}$/.test(p.reference || '') ||
      typeof p.issuedAt !== 'number' || Math.abs(Date.now() - p.issuedAt) > 300000)
    return reply_(p.reference || '', 'failed', 'invalid');
  var reference = p.reference;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return reply_(reference, 'pending', 'busy');
  try {
    var key = 'delivery_' + reference;
    var fingerprint = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify([p.name, p.email, p.position, p.coverLetter, p.files]))
      .map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
    var prior = props.getProperty(key);
    if (prior) {
      var recorded = JSON.parse(prior);
      if (recorded.fingerprint !== fingerprint) return reply_(reference, 'pending', 'reference_conflict');
      return reply_(reference, recorded.state, 'duplicate');
    }
    // Never evict dedupe keys automatically. Fail closed before Properties quota.
    if (Object.keys(props.getProperties()).filter(function(k) { return k.indexOf('delivery_') === 0; }).length >= 1500)
      return reply_(reference, 'failed', 'ledger_full');
    var files = [];
    var total = 0;
    try {
      if (typeof p.name !== 'string' || p.name.length < 2 || p.name.length > 100 ||
          typeof p.email !== 'string' || p.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) ||
          typeof p.position !== 'string' || p.position.length > 180 || /[\r\n]/.test(p.position) ||
          typeof p.coverLetter !== 'string' || p.coverLetter.length > 22000 ||
          !Array.isArray(p.files) || p.files.length < 1 || p.files.length > 2 ||
          !/^resume\.(pdf|docx)$/.test(p.files[0].name) ||
          (p.files.length === 2 && !/^cover\.(pdf|docx)$/.test(p.files[1].name))) throw new Error('invalid');
      p.files.forEach(function(f) {
        var pdf = f.mimeType === 'application/pdf' && /^(resume|cover)\.pdf$/.test(f.name);
        var docx = f.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && /^(resume|cover)\.docx$/.test(f.name);
        if ((!pdf && !docx) || typeof f.base64 !== 'string' || f.base64.length > 2796204 ||
            !/^[A-Za-z0-9+/]+={0,2}$/.test(f.base64)) throw new Error('invalid');
        var bytes = Utilities.base64Decode(f.base64);
        total += bytes.length;
        if (!bytes.length || bytes.length > 2097152 || total > 3145728) throw new Error('invalid');
        var raw = bytes.map(function(b) { return String.fromCharCode((b + 256) % 256); }).join('');
        if (pdf && (raw.indexOf('%PDF-') !== 0 || raw.indexOf('%%EOF') < 0 || /\/JavaScript|\/JS\b|\/Launch|\/EmbeddedFile|\/OpenAction/i.test(raw))) throw new Error('invalid');
        if (docx && (raw.slice(0,4) !== 'PK\x03\x04' || raw.indexOf('[Content_Types].xml') < 0 || raw.indexOf('word/document.xml') < 0 || /vbaProject|embeddings\/|activeX\//i.test(raw))) throw new Error('invalid');
        files.push(Utilities.newBlob(bytes, f.mimeType, f.name));
      });
    } catch (_) { return reply_(reference, 'failed', 'invalid'); }
    if (MailApp.getRemainingDailyQuota() < 1) return reply_(reference, 'failed', 'quota');
    // Persist BEFORE sending. Never retry a pending reference, even after a crash.
    props.setProperty(key, JSON.stringify({ state: 'pending', fingerprint: fingerprint, at: Date.now() }));
    try {
      MailApp.sendEmail({
        to: 'codexstechnology@gmail.com',
        subject: 'CodesBoxs application [' + reference + '] ' + p.position,
        body: 'Reference: ' + reference + '\nName: ' + p.name + '\nEmail: ' + p.email +
          '\nPosition: ' + p.position + '\n\n' + p.coverLetter +
          '\n\nUntrusted attachments. Do not enable active content. No offer is implied.',
        attachments: files
      });
      props.setProperty(key, JSON.stringify({ state: 'sent', fingerprint: fingerprint, at: Date.now() }));
      return reply_(reference, 'sent', 'accepted_by_mailapp');
    } catch (_) {
      // An exception may occur after delivery: leave the pending tombstone intact.
      return reply_(reference, 'pending', 'manual_reconciliation');
    }
  } catch (_) { return reply_(reference, 'pending', 'manual_reconciliation'); }
  finally { lock.releaseLock(); }
}