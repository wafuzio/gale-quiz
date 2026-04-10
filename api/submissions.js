var createClient = require("redis").createClient;
var createHash = require("crypto").createHash;
var STORE_KEY = "galeQuizSubmissions";
var DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
var DEFAULT_ADMIN_KEY = "gimmethosetokens";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

var redisClientPromise;

function hasRedisUrl() {
  return Boolean(process.env.REDIS_URL);
}

function getRedisClient() {
  if (!hasRedisUrl()) return Promise.resolve(null);
  if (!redisClientPromise) {
    var client = createClient({ url: process.env.REDIS_URL });
    client.on("error", function() {});
    redisClientPromise = client.connect().then(function() { return client; });
  }
  return redisClientPromise;
}

async function redisAppendSubmission(record) {
  var client = await getRedisClient();
  if (!client) throw new Error("Missing REDIS_URL");
  await client.rPush(STORE_KEY, JSON.stringify(record));
}

async function redisGetSubmissions() {
  var client = await getRedisClient();
  if (!client) throw new Error("Missing REDIS_URL");
  var rows = await client.lRange(STORE_KEY, 0, -1);
  return rows.map(function(item) {
    try {
      return JSON.parse(item);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

async function redisSetSubmissions(records) {
  var client = await getRedisClient();
  if (!client) throw new Error("Missing REDIS_URL");
  await client.del(STORE_KEY);
  if (Array.isArray(records) && records.length) {
    var encoded = records.map(function(r) { return JSON.stringify(r); });
    await client.rPush(STORE_KEY, encoded);
  }
}

async function kvGet(key) {
  var baseUrl = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  }

  var resp = await fetch(baseUrl + "/get/" + encodeURIComponent(key), {
    headers: { Authorization: "Bearer " + token }
  });

  if (!resp.ok) {
    throw new Error("KV GET failed");
  }

  var data = await resp.json();
  return data && data.result ? data.result : null;
}

async function kvSet(key, value) {
  var baseUrl = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  }

  var resp = await fetch(baseUrl + "/set/" + encodeURIComponent(key), {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(value)
  });

  if (!resp.ok) {
    throw new Error("KV SET failed");
  }
}

function normalizeRespondentKey(value) {
  if (typeof value !== "string") return "";
  var trimmed = value.trim();
  return trimmed.slice(0, 128);
}

function toIsoNow() {
  return new Date().toISOString();
}

function normalizeKey(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function getEffectiveAdminKey() {
  var configured = process.env.SUBMISSIONS_ADMIN_KEY;
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim();
  }
  return DEFAULT_ADMIN_KEY;
}

function createResponseFingerprint(responses) {
  var normalized = {};
  var source = responses && typeof responses === "object" ? responses : {};
  Object.keys(source).sort().forEach(function(key) {
    var val = source[key];
    if (Array.isArray(val)) {
      normalized[key] = val.slice().sort();
    } else {
      normalized[key] = val;
    }
  });
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function getRecordTimestamp(record) {
  var maybeTs = record && (record.updatedAt || record.receivedAt || record.createdAt);
  var ms = Date.parse(maybeTs || "");
  return Number.isFinite(ms) ? ms : 0;
}

function findExistingIndex(submissions, respondentKey, fingerprint) {
  if (respondentKey) {
    var byKey = submissions.findIndex(function(r) { return r && r.respondentKey === respondentKey; });
    if (byKey >= 0) return byKey;
  }
  var now = Date.now();
  return submissions.findIndex(function(r) {
    if (!r || r.fingerprint !== fingerprint) return false;
    var ts = getRecordTimestamp(r);
    return ts > 0 && (now - ts) <= DEDUPE_WINDOW_MS;
  });
}

async function loadSubmissions() {
  var allData = hasRedisUrl() ? await redisGetSubmissions() : await kvGet(STORE_KEY);
  return Array.isArray(allData) ? allData : [];
}

async function saveSubmissions(rows) {
  if (hasRedisUrl()) {
    await redisSetSubmissions(rows);
    return;
  }
  await kvSet(STORE_KEY, rows);
}

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    try {
      var body = req.body || {};
      if (!body.responses || typeof body.responses !== "object") {
        return json(res, 400, { error: "Invalid submission payload" });
      }

      var respondentKey = normalizeRespondentKey(body.respondentKey);
      var fingerprint = createResponseFingerprint(body.responses);
      var submissions = await loadSubmissions();
      var existingIndex = findExistingIndex(submissions, respondentKey, fingerprint);
      var nowIso = toIsoNow();
      var isUpdate = existingIndex >= 0;
      var existing = isUpdate ? submissions[existingIndex] : null;
      var id = existing && existing.id ? existing.id : (Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
      var record = {
        id: id,
        respondentKey: respondentKey || (existing && existing.respondentKey) || "",
        fingerprint: fingerprint,
        createdAt: existing && existing.createdAt ? existing.createdAt : nowIso,
        updatedAt: nowIso,
        receivedAt: nowIso,
        payload: body
      };

      if (isUpdate) {
        submissions[existingIndex] = record;
      } else {
        submissions.push(record);
      }
      await saveSubmissions(submissions);

      return json(res, 200, { ok: true, id: id, replaced: isUpdate });
    } catch (err) {
      return json(res, 500, {
        error: "Submission storage failed",
        details: err && err.message ? err.message : "Unknown error"
      });
    }
  }

  if (req.method === "GET") {
    try {
      var adminKey = getEffectiveAdminKey();
      var supplied = req.headers["x-admin-key"] || req.query.key;
      if (normalizeKey(supplied) !== normalizeKey(adminKey)) {
        return json(res, 401, { error: "Unauthorized" });
      }

      var rows = await loadSubmissions();
      return json(res, 200, { count: rows.length, submissions: rows });
    } catch (err2) {
      return json(res, 500, {
        error: "Failed to read submissions",
        details: err2 && err2.message ? err2.message : "Unknown error"
      });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return json(res, 405, { error: "Method not allowed" });
};
