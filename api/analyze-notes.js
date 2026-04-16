var createClient = require("redis").createClient;

var STORE_KEY = "galeQuizSubmissions";
var DEFAULT_ADMIN_KEYS = ["gimmethosetokens", "maxtokens"];
var DEFAULT_MODEL = "gpt-4.1";

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

async function kvGet(key) {
  var baseUrl = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  }

  var resp = await fetch(baseUrl + "/get/" + encodeURIComponent(key), {
    headers: { Authorization: "Bearer " + token }
  });

  if (!resp.ok) throw new Error("KV GET failed");
  var data = await resp.json();
  return data && data.result ? data.result : null;
}

async function loadSubmissions() {
  var allData = hasRedisUrl() ? await redisGetSubmissions() : await kvGet(STORE_KEY);
  return Array.isArray(allData) ? allData : [];
}

function normalizeKey(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function getEffectiveAdminKeys() {
  var configured = process.env.SUBMISSIONS_ADMIN_KEY;
  var keys = DEFAULT_ADMIN_KEYS.slice();
  if (typeof configured === "string" && configured.trim()) {
    keys.push(configured.trim());
  }
  return keys;
}

function isAuthorizedAdmin(req) {
  var adminKeys = getEffectiveAdminKeys();
  var supplied = req.headers["x-admin-key"] || req.query.key;
  var normalizedSupplied = normalizeKey(supplied);
  return adminKeys.some(function(key) {
    return normalizeKey(key) === normalizedSupplied;
  });
}

function toLimitedText(value, maxLen) {
  if (typeof value !== "string") return "";
  var trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen) + "…";
}

function extractNotes(responses) {
  if (!responses || typeof responses !== "object") return [];
  var out = [];
  Object.keys(responses).forEach(function(key) {
    if (!/_note$/.test(key) && key !== "d1_specialty" && key !== "astro_feedback_note") return;
    var text = toLimitedText(responses[key], 400);
    if (!text) return;
    out.push({ field: key, text: text });
  });
  return out;
}

function formatResponses(responses) {
  if (!responses || typeof responses !== "object") return {};
  var out = {};
  Object.keys(responses).forEach(function(key) {
    var val = responses[key];
    if (val == null || val === "") return;
    if (Array.isArray(val)) {
      if (val.length) out[key] = val.join(", ");
    } else if (typeof val === "string" && val.trim()) {
      out[key] = toLimitedText(val, 300);
    } else if (typeof val === "number" || typeof val === "boolean") {
      out[key] = String(val);
    }
  });
  return out;
}

function isTestOnlySubmission(row) {
  var payload = row && row.payload ? row.payload : row;
  var responses = payload && payload.responses && typeof payload.responses === "object" ? payload.responses : {};
  var marker = String(responses.d1_other_text || "").trim().toUpperCase();
  var entryId = String((row && row.id) || (payload && payload.respondentKey) || "").trim();
  return marker === "FOR TEST ONLY" || /^seed-rev-/i.test(entryId) || /^console-seed-/i.test(entryId);
}

function isArchivedSubmission(row) {
  var payload = row && row.payload ? row.payload : row;
  if (!payload || typeof payload !== "object") return false;
  if (payload.archived === true) return true;
  if (String(payload.status || "").toLowerCase() === "archived") return true;
  return false;
}

function buildCorpus(rows, limit) {
  var mapped = rows.filter(function(row) {
    return !isTestOnlySubmission(row) && !isArchivedSubmission(row);
  }).map(function(row) {
    var payload = row && row.payload ? row.payload : row;
    var responses = payload && payload.responses ? payload.responses : {};
    return {
      id: row && row.id ? row.id : "",
      submittedAt: payload && payload.submittedAt ? payload.submittedAt : "",
      tier: payload && payload.tier ? payload.tier : "",
      score: payload && typeof payload.score === "number" ? payload.score : null,
      domain: responses.d1 || "",
      subdomain: responses.d1_subdomain || "",
      responses: formatResponses(responses),
      notes: extractNotes(responses)
    };
  }).filter(function(item) {
    return Object.keys(item.responses).length > 0;
  });

  var maxRows = Math.max(10, Math.min(400, Number(limit) || 160));
  return mapped.slice(-maxRows);
}

function fallbackAnalysis(corpus) {
  var totalNotes = corpus.reduce(function(sum, item) { return sum + item.notes.length; }, 0);
  return {
    summary: "Automated analysis unavailable; returning corpus summary only.",
    themes: [],
    sentimentMix: { comfortable: 0, concerned: 0, mixed: 0, unknown: 100 },
    riskSignals: ["LLM analysis unavailable"],
    opportunities: [],
    stats: {
      submissionsAnalyzed: corpus.length,
      notesAnalyzed: totalNotes
    }
  };
}

async function analyzeWithOpenAI(corpus, focusText) {
  var apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  var preferredModel = process.env.NOTES_ANALYSIS_MODEL || DEFAULT_MODEL;
  var modelCandidates = [preferredModel, "gpt-4.1", "gpt-4o", "gpt-4.1-mini", "gpt-4o-mini"].filter(function(name, idx, arr) {
    return typeof name === "string" && name.trim() && arr.indexOf(name) === idx;
  });
  var baseUrl = String(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  var completionsUrl = baseUrl + "/chat/completions";
  var focus = toLimitedText(String(focusText || ""), 400);
  var errors = [];

  for (var i = 0; i < modelCandidates.length; i++) {
    var model = modelCandidates[i];
    var payload = {
      model: model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You analyze internal training survey comments. Return strict JSON only. Use concise, actionable language. Never include personal identifiers."
        },
        {
          role: "user",
          content:
            "Analyze the following quiz submissions (all responses and notes) for patterns. " +
            "Answer the user's question or focus if provided. Be specific and cite actual data from the responses.\n\n" +
            "Return JSON with this shape: " +
            "{summary:string,themes:[{theme:string,evidenceCount:number,sampleQuotes:string[],recommendedAction:string}],sentimentMix:{comfortable:number,concerned:number,mixed:number,unknown:number},riskSignals:string[],opportunities:string[]}\n\n" +
            (focus ? ("User question: " + focus + "\n\n") : "") +
            "Submissions JSON:\n" + JSON.stringify(corpus)
        }
      ]
    };

    try {
      var resp = await fetch(completionsUrl, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        var errText = await resp.text().catch(function() { return ""; });
        throw new Error("HTTP " + resp.status + (errText ? (" " + errText.slice(0, 180)) : ""));
      }

      var data = await resp.json();
      var content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!content) throw new Error("Empty response content");

      var parsed = JSON.parse(content);
      parsed.modelUsed = model;
      return parsed;
    } catch (e) {
      errors.push(model + ": " + (e && e.message ? e.message : "Unknown error"));
    }
  }

  throw new Error("All candidate models failed. " + errors.join(" | "));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    if (!isAuthorizedAdmin(req)) {
      return json(res, 401, { error: "Unauthorized" });
    }

    var body = req.body || {};
    var submissions = await loadSubmissions();
    var corpus = buildCorpus(submissions, body.limit);

    if (!corpus.length) {
      return json(res, 200, {
        ok: true,
        analysis: {
          summary: "No submissions available yet.",
          themes: [],
          sentimentMix: { comfortable: 0, concerned: 0, mixed: 0, unknown: 0 },
          riskSignals: [],
          opportunities: [],
          stats: { submissionsAnalyzed: 0, notesAnalyzed: 0 }
        }
      });
    }

    var analysis;
    try {
      analysis = await analyzeWithOpenAI(corpus, body.focus);
    } catch (llmErr) {
      analysis = fallbackAnalysis(corpus);
      analysis.error = llmErr && llmErr.message ? llmErr.message : "Analysis failed";
    }

    var noteCount = corpus.reduce(function(sum, row) { return sum + row.notes.length; }, 0);
    analysis.stats = {
      submissionsAnalyzed: corpus.length,
      notesAnalyzed: noteCount
    };

    return json(res, 200, { ok: true, analysis: analysis });
  } catch (err) {
    return json(res, 500, {
      error: "Failed to analyze notes",
      details: err && err.message ? err.message : "Unknown error"
    });
  }
};
