var createClient = require("redis").createClient;
var createHash = require("crypto").createHash;
var fs = require("fs");
var path = require("path");
var STORE_KEY = "galeQuizSubmissions";
var DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
var DEFAULT_ADMIN_KEYS = ["gimmethosetokens", "maxtokens"];
var LOCAL_SUBMISSIONS_FILE = path.join(process.cwd(), "data", "submissions.json");
var inMemoryFallbackRows = null;

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

function getEffectiveAdminKeys() {
  var configured = process.env.SUBMISSIONS_ADMIN_KEY;
  var keys = DEFAULT_ADMIN_KEYS.slice();
  if (typeof configured === "string" && configured.trim()) {
    keys.push(configured.trim());
  }
  return keys;
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

function toArrayShape(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.submissions)) return raw.submissions;
  return [];
}

function makeSeedRecord(id, payload, createdAt) {
  var nowIso = createdAt || toIsoNow();
  return {
    id: id,
    respondentKey: payload && payload.respondentKey ? payload.respondentKey : ("seed-" + id),
    fingerprint: createResponseFingerprint((payload && payload.responses) || {}),
    createdAt: nowIso,
    updatedAt: nowIso,
    receivedAt: nowIso,
    payload: payload
  };
}

function buildSeedRevisedSubmissions() {
  var base = "FOR TEST ONLY";
  return [
    makeSeedRecord("seed-rev-001", {
      submittedAt: "2026-04-15T19:05:00.000Z",
      respondentKey: "seed-rev-001",
      quizVersion: "revised",
      scoreModel: "revised_v1",
      score: 24.1,
      tier: "Tier 1",
      tierLabel: "Advanced: ready to fully integrate rich experience into GALE systems",
      tierDesc: "Strong evidence of advanced application, automation depth, and reliable quality controls",
      trackRecommendation: "Advanced builder track",
      flags: [],
      subtags: ["Workflow depth", "Code & API depth", "Verification-first"],
      mergeRecommendation: false,
      responses: {
        d1: "Other",
        d1_other_text: base,
        c1: "Deep end — agents, APIs, vibe coding, the works",
        q1: "Constantly — it's woven into how I work",
        t1: ["ChatGPT", "Claude", "Microsoft Copilot", "GitHub Copilot", "Cursor / Claude Code / other coding tools", "NotebookLM"],
        q2: ["Coding or building tools", "Research and synthesis", "Client work and deliverables"],
        q2b: ["Coding or building tools", "Research and synthesis"],
        q2a: "Prescriptive — detailed prompts with examples, format specs, the works",
        q3: "Yes",
        q4: "Yes",
        qv1: "Verify against original sources/materials before proceeding",
        s0: ["Campaign reporting or performance summary"],
        s1: ["Use AI as part of recurring workflows", "Connect AI to other tools or automations", "Write code that calls AI APIs", "Build custom tools/apps powered by AI"],
        outside_ai: ["I use it to build things", "It's fun to use"],
        blockers: ["Nothing's blocking me — I just want to go deeper"],
        program_topics: ["Agentic AI and autonomous workflows", "RAG, knowledge graphs, and context systems"],
        s2: ["A library of GALE-built Skills and workflows"],
        q15: ["Hands-on workshops where I build something"],
        feedback_change: "Add advanced implementation clinics.",
        share_segment_name: "Seed Persona A",
        share_segment_idea: "Demo an agentic campaign QA loop.",
        feedback_other: ""
      }
    }, "2026-04-15T19:05:00.000Z"),
    makeSeedRecord("seed-rev-002", {
      submittedAt: "2026-04-15T19:10:00.000Z",
      respondentKey: "seed-rev-002",
      quizVersion: "revised",
      scoreModel: "revised_v1",
      score: 17.3,
      tier: "Tier 2",
      tierLabel: "Ready to expand current use cases",
      tierDesc: "Consistent practical usage with room to scale into stronger cross-team and system-level workflows",
      trackRecommendation: "Applied acceleration track",
      flags: ["Prioritize verification and client-safe deployment guidance"],
      subtags: ["Prompting depth", "Data & documents depth"],
      mergeRecommendation: false,
      responses: {
        d1: "Other",
        d1_other_text: base,
        c1: "Comfortable — it's part of my regular workflow",
        q1: "Daily for specific tasks",
        t1: ["ChatGPT", "Claude", "Microsoft Copilot", "Notion AI", "Canva AI"],
        q2: ["Writing and editing", "Research and synthesis", "Slides, docs, decks", "Internal ops (notes, summaries, emails)"],
        q2b: ["Writing and editing", "Research and synthesis"],
        q2a: "Structured — I usually give it context, role, and constraints",
        q3: "Sometimes",
        q4: "Yes",
        qv1: "Ask AI to rerun with tighter constraints, then review carefully",
        s0: ["Media brief or creative brief"],
        s1: ["Use role/context-rich prompts (beyond basic ask/answer)", "Turn AI output into deliverables shared with others"],
        outside_ai: ["I use it for advice", "curious but cautious"],
        blockers: ["Can't tell if the output is good"],
        program_topics: ["Prompt engineering and craft", "Tool comparisons and what's new"],
        s2: ["Curated tool recommendations for my role", "Templates and starter prompts I can steal"],
        q15: ["Guided tutorials with takeaway materials"],
        feedback_change: "Would love role-based templates.",
        share_segment_name: "",
        share_segment_idea: "",
        feedback_other: ""
      }
    }, "2026-04-15T19:10:00.000Z"),
    makeSeedRecord("seed-rev-003", {
      submittedAt: "2026-04-15T19:15:00.000Z",
      respondentKey: "seed-rev-003",
      quizVersion: "revised",
      scoreModel: "revised_v1",
      score: 11.2,
      tier: "Tier 3",
      tierLabel: "Foundational: ready to apply core workflows",
      tierDesc: "Best fit for foundational skill-building and repeatable quality habits before advanced system-level expansion",
      trackRecommendation: "Foundational enablement track",
      flags: ["Prioritize prompt quality coaching", "Prioritize source-verification habits on high-stakes deliverables"],
      subtags: ["Prompt quality friction", "Verification-risk"],
      mergeRecommendation: false,
      responses: {
        d1: "Other",
        d1_other_text: base,
        c1: "Just getting started — still figuring out what to use it for",
        q1: "Rarely / not yet",
        q1a: "I’ve tried them a couple of times but they didn’t stick",
        t1: ["ChatGPT"],
        q2: ["Conversational Q&A", "Research and synthesis"],
        q2b: ["None of these"],
        q2a: "Honestly, I don't have a style yet",
        q2a1: "I usually keep prompts short and unstructured",
        q3: "No",
        q3a: "I usually accept the first result or stop there",
        q4: "No",
        q4a: "I didn’t realize AI could work well with files/data for this",
        qv1: "Abandon AI and do it another way",
        s0: ["None of these yet"],
        s1: ["None of these yet"],
        outside_ai: ["I am overwhelmed by it", "I don't trust it"],
        blockers: ["Don't know where to start", "My prompts don't get great results"],
        program_topics: ["AI fundamentals and the basics"],
        s2: ["Templates and starter prompts I can steal"],
        q15: ["Short tactical tips (5-min segments)"],
        feedback_change: "Need more beginner examples.",
        share_segment_name: "",
        share_segment_idea: "",
        feedback_other: ""
      }
    }, "2026-04-15T19:15:00.000Z"),
    makeSeedRecord("seed-rev-004", {
      submittedAt: "2026-04-15T19:20:00.000Z",
      respondentKey: "seed-rev-004",
      quizVersion: "revised",
      scoreModel: "revised_v1",
      score: 15.4,
      tier: "Tier 2",
      tierLabel: "Ready to expand current use cases",
      tierDesc: "Consistent practical usage with room to scale into stronger cross-team and system-level workflows",
      trackRecommendation: "Applied acceleration track",
      flags: [],
      subtags: ["Wants peer examples"],
      mergeRecommendation: false,
      responses: {
        d1: "Other",
        d1_other_text: base,
        c1: "Dabbling — I use it for some things, mostly the basics",
        q1: "A few times a week",
        t1: ["ChatGPT", "Midjourney", "Adobe Firefly", "Canva AI", "Figma AI (Weave)"],
        q2: ["Writing and editing", "Brainstorming and ideation", "Image, video, or design generation"],
        q2b: ["Writing and editing", "Brainstorming and ideation"],
        q2a: "Go with the flow — I start loose and refine as I go",
        q2a1: "I add some detail, but not consistently",
        q3: "Sometimes",
        q4: "No",
        q4a: "I’ve tried once or twice, but it’s not repeatable yet",
        qv1: "Ask a teammate for a quick sense-check before deciding",
        s0: ["Media brief or creative brief"],
        s1: ["Turn AI output into deliverables shared with others"],
        outside_ai: ["It's fun to use", "I use it as a creative outlet"],
        blockers: ["Tools change too fast to keep up"],
        program_topics: ["Image, video, and multimodal generation", "Slides, docs, and content creation"],
        s2: ["Recordings of past sessions"],
        q15: ["Show-and-tell from GALE colleagues"],
        feedback_change: "More creative showcases would help.",
        share_segment_name: "Seed Persona D",
        share_segment_idea: "Can share a creative prompt chain.",
        feedback_other: ""
      }
    }, "2026-04-15T19:20:00.000Z"),
    makeSeedRecord("seed-rev-005", {
      submittedAt: "2026-04-15T19:25:00.000Z",
      respondentKey: "seed-rev-005",
      quizVersion: "revised",
      scoreModel: "revised_v1",
      score: 22.0,
      tier: "Tier 1",
      tierLabel: "Advanced: ready to fully integrate rich experience into GALE systems",
      tierDesc: "Strong evidence of advanced application, automation depth, and reliable quality controls",
      trackRecommendation: "Advanced builder track",
      flags: ["Prioritize verification and client-safe deployment guidance"],
      subtags: ["Data & documents depth", "Workflow depth", "Verification-first"],
      mergeRecommendation: false,
      responses: {
        d1: "Other",
        d1_other_text: base,
        c1: "Building — I'm making things with it (prompts, workflows, tools, code)",
        q1: "Daily for specific tasks",
        t1: ["ChatGPT", "Claude", "Perplexity", "NotebookLM", "Microsoft Copilot", "GitHub Copilot"],
        q2: ["Research and synthesis", "Data analysis or spreadsheets", "Client work and deliverables"],
        q2b: ["Research and synthesis", "Data analysis or spreadsheets"],
        q2a: "Structured — I usually give it context, role, and constraints",
        q3: "Yes",
        q4: "Yes",
        qv1: "Verify against original sources/materials before proceeding",
        s0: ["Competitive or market research synthesis", "Campaign reporting or performance summary"],
        s1: ["Use AI with documents or data to produce analysis or recommendations", "Use AI as part of recurring workflows", "Connect AI to other tools or automations"],
        outside_ai: ["I use it like Google", "curious but cautious"],
        blockers: ["Not sure what's safe for client work"],
        program_topics: ["Best practices and frameworks", "RAG, knowledge graphs, and context systems"],
        s2: ["1:1 office hours with someone more advanced"],
        q15: ["Discussion and Q&A"],
        feedback_change: "Add more governance examples.",
        share_segment_name: "Seed Persona E",
        share_segment_idea: "Could share an evidence-check workflow.",
        feedback_other: ""
      }
    }, "2026-04-15T19:25:00.000Z")
  ];
}

function getSeedRows() {
  if (!inMemoryFallbackRows) {
    inMemoryFallbackRows = buildSeedRevisedSubmissions();
  }
  return inMemoryFallbackRows.slice();
}

async function readLocalFallbackRows() {
  try {
    if (!fs.existsSync(LOCAL_SUBMISSIONS_FILE)) return null;
    var raw = fs.readFileSync(LOCAL_SUBMISSIONS_FILE, "utf8");
    var parsed = JSON.parse(raw);
    return toArrayShape(parsed);
  } catch (e) {
    return null;
  }
}

async function writeLocalFallbackRows(rows) {
  try {
    var nextRows = Array.isArray(rows) ? rows : [];
    var payload = { count: nextRows.length, submissions: nextRows };
    fs.mkdirSync(path.dirname(LOCAL_SUBMISSIONS_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_SUBMISSIONS_FILE, JSON.stringify(payload, null, 2), "utf8");
    inMemoryFallbackRows = nextRows.slice();
    return true;
  } catch (e) {
    inMemoryFallbackRows = Array.isArray(rows) ? rows.slice() : [];
    return false;
  }
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
  if (hasRedisUrl()) {
    return await redisGetSubmissions();
  }

  try {
    var kvRows = await kvGet(STORE_KEY);
    if (Array.isArray(kvRows)) return kvRows;
  } catch (e) {}

  var fileRows = await readLocalFallbackRows();
  if (Array.isArray(fileRows) && fileRows.length) return fileRows;

  return getSeedRows();
}

async function saveSubmissions(rows) {
  if (hasRedisUrl()) {
    await redisSetSubmissions(rows);
    return;
  }

  try {
    await kvSet(STORE_KEY, rows);
    return;
  } catch (e) {}

  await writeLocalFallbackRows(rows);
}

function isAuthorizedAdmin(req) {
  var adminKeys = getEffectiveAdminKeys();
  var supplied = req.headers["x-admin-key"] || req.query.key;
  var normalizedSupplied = normalizeKey(supplied);
  return adminKeys.some(function(key) {
    return normalizeKey(key) === normalizedSupplied;
  });
}

function toStringList(value) {
  if (Array.isArray(value)) {
    return value.map(function(v) { return String(v || "").trim(); }).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(";").map(function(v) { return String(v || "").trim(); }).filter(Boolean);
  }
  return [];
}

function normalizeUsageList(value) {
  var NONE = "None of these";
  var list = toStringList(value);
  var hasNone = list.some(function(v) { return String(v || "").trim().toLowerCase() === NONE.toLowerCase(); });
  if (hasNone) return [NONE];
  return list.filter(function(v) { return String(v || "").trim().toLowerCase() !== NONE.toLowerCase(); });
}

function normalizeToolList(value) {
  return toStringList(value);
}

function trackRecommendationForTier(tierName) {
  if (tierName === "Tier 1") return "Advanced builder track";
  if (tierName === "Tier 2") return "Applied acceleration track";
  return "Foundational enablement track";
}

function computeTierFromScore(score) {
  if (score >= 21) {
    return {
      name: "Tier 1",
      label: "Advanced: ready to fully integrate rich experience into GALE systems",
      desc: "Strong evidence of advanced application, automation depth, and reliable quality controls"
    };
  }
  if (score >= 14) {
    return {
      name: "Tier 2",
      label: "Ready to expand current use cases",
      desc: "Consistent practical usage with room to scale into stronger cross-team and system-level workflows"
    };
  }
  return {
    name: "Tier 3",
    label: "Foundational: ready to apply core workflows",
    desc: "Best fit for foundational skill-building and repeatable quality habits before advanced system-level expansion"
  };
}

function computeRevisedScoreFromResponses(responses) {
  var a = responses && typeof responses === "object" ? responses : {};
  var total = 0;
  var breakdown = {};
  var coreWeights = {
    q1: 2,
    q2a: 2,
    q3: 3,
    q4: 2.5,
    qv1: 2.4
  };
  var q1Map = {
    "Rarely / not yet": 0,
    "A few times a week": 0.45,
    "Daily for specific tasks": 0.75,
    "Constantly — it's woven into how I work": 1
  };
  var q2aMap = {
    "Casual and conversational — I just talk to it like a person": 0.2,
    "Go with the flow — I start loose and refine as I go": 0.45,
    "Structured — I usually give it context, role, and constraints": 0.8,
    "Prescriptive — detailed prompts with examples, format specs, the works": 1,
    "Honestly, I don't have a style yet": 0
  };
  var qv1Map = {
    "Verify against original sources/materials before proceeding": 1,
    "Ask AI to rerun with tighter constraints, then review carefully": 0.72,
    "Ask a teammate for a quick sense-check before deciding": 0.62,
    "Abandon AI and do it another way": 0.45,
    "Edit the wording/tone and use it": 0.05
  };

  function addMapped(questionId, answer, map) {
    var weight = coreWeights[questionId] || 1;
    var signal = typeof map[answer] === "number" ? map[answer] : 0;
    var points = Math.round((Math.max(0, Math.min(1, signal)) * weight) * 10) / 10;
    breakdown[questionId] = points;
    total += points;
  }

  addMapped("q1", a.q1, q1Map);
  addMapped("q2a", a.q2a, q2aMap);
  addMapped("qv1", a.qv1, qv1Map);

  if (a.q1 === "Rarely / not yet") {
    var q1FollowMap = {
      "I haven’t really had the chance to try AI tools yet": 0,
      "I’ve tried them a couple of times but they didn’t stick": 0.25,
      "I use them for personal stuff but not for work": 0.5
    };
    var q1Signal = typeof q1FollowMap[a.q1a] === "number" ? q1FollowMap[a.q1a] : 0;
    breakdown.q1 = Math.round((Math.max(0, Math.min(0.45, q1Signal)) * coreWeights.q1) * 10) / 10;
    total += breakdown.q1 - (typeof q1Map[a.q1] === "number" ? Math.round((Math.max(0, Math.min(1, q1Map[a.q1])) * coreWeights.q1) * 10) / 10 : 0);
  }

  if (Array.isArray([
    "Casual and conversational — I just talk to it like a person",
    "Go with the flow — I start loose and refine as I go",
    "Honestly, I don't have a style yet"
  ]) && [
    "Casual and conversational — I just talk to it like a person",
    "Go with the flow — I start loose and refine as I go",
    "Honestly, I don't have a style yet"
  ].indexOf(a.q2a) >= 0) {
    var q2aFollowMap = {
      "I usually keep prompts short and unstructured": 0,
      "I add some detail, but not consistently": 0.25,
      "I include some structure, but I’m still refining what works": 0.5
    };
    if (typeof q2aFollowMap[a.q2a1] === "number") {
      var q2aBaseSignal = typeof q2aMap[a.q2a] === "number" ? Math.max(0, Math.min(1, q2aMap[a.q2a])) : 0;
      var q2aFollowSignal = Math.max(0, Math.min(0.5, q2aFollowMap[a.q2a1]));
      var q2aEffectiveSignal = Math.max(q2aBaseSignal, q2aFollowSignal);
      var q2aAdjustedPts = Math.round((q2aEffectiveSignal * coreWeights.q2a) * 10) / 10;
      total += q2aAdjustedPts - (breakdown.q2a || 0);
      breakdown.q2a = q2aAdjustedPts;
    }
  }

  if (a.q3 === "Yes") {
    breakdown.q3 = coreWeights.q3;
    total += coreWeights.q3;
  } else if (a.q3 === "Sometimes") {
    breakdown.q3 = Math.round((coreWeights.q3 * 0.5) * 10) / 10;
    total += breakdown.q3;
  } else {
    var q3FollowMap = {
      "I usually accept the first result or stop there": 0,
      "I retry sometimes, but mostly with minor wording tweaks": 0.25,
      "I intentionally revise instructions/context, but not consistently": 0.5
    };
    var q3Sig = typeof q3FollowMap[a.q3a] === "number" ? q3FollowMap[a.q3a] : 0;
    breakdown.q3 = Math.round((Math.max(0, Math.min(0.5, q3Sig)) * coreWeights.q3) * 10) / 10;
    total += breakdown.q3;
  }

  if (a.q4 === "Yes") {
    breakdown.q4 = coreWeights.q4;
    total += coreWeights.q4;
  } else {
    var q4FollowMap = {
      "I didn’t realize AI could work well with files/data for this": 0,
      "I’ve tried once or twice, but it’s not repeatable yet": 0.25,
      "I can do this in limited cases, but not consistently": 0.5
    };
    var q4Sig = typeof q4FollowMap[a.q4a] === "number" ? q4FollowMap[a.q4a] : 0;
    breakdown.q4 = Math.round((Math.max(0, Math.min(0.5, q4Sig)) * coreWeights.q4) * 10) / 10;
    total += breakdown.q4;
  }

  var q2Used = toStringList(a.q2);
  var q2Comfort = normalizeUsageList(a.q2b);
  var comfortScore = Math.min(3.2, q2Comfort.length * 0.55);
  var usageBreadthScore = Math.min(1.8, q2Used.length * 0.2);
  var q2ProfileScore = Math.round((comfortScore + usageBreadthScore) * 10) / 10;
  breakdown.q2_profile = q2ProfileScore;
  total += q2ProfileScore;

  var c1Map = {
    "Just getting started — still figuring out what to use it for": 0,
    "Dabbling — I use it for some things, mostly the basics": 0.4,
    "Comfortable — it's part of my regular workflow": 0.8,
    "Building — I'm making things with it (prompts, workflows, tools, code)": 1.2,
    "Deep end — agents, APIs, vibe coding, the works": 1.5
  };
  var c1Score = c1Map[a.c1] || 0;
  breakdown.c1_readiness = c1Score;
  total += c1Score;

  var tools = normalizeToolList(a.t1).filter(function(tool) { return tool !== "Other"; });
  var toolBreadthScore = Math.min(2.2, tools.length * 0.2);
  var advancedToolScore = 0;
  if (tools.indexOf("ALCHEMY AI") >= 0) advancedToolScore += 0.25;
  if (tools.indexOf("Cursor / Claude Code / other coding tools") >= 0) advancedToolScore += 0.25;
  if (tools.indexOf("NotebookLM") >= 0) advancedToolScore += 0.2;
  if (tools.indexOf("Perplexity") >= 0) advancedToolScore += 0.15;
  if (tools.indexOf("Midjourney") >= 0 || tools.indexOf("Weavy") >= 0) advancedToolScore += 0.15;
  advancedToolScore = Math.min(0.9, advancedToolScore);
  var t1Score = Math.round((toolBreadthScore + advancedToolScore) * 10) / 10;
  breakdown.t1_tool_profile = t1Score;
  total += t1Score;

  var s0 = toStringList(a.s0);
  var s1 = toStringList(a.s1);
  var s0Map = {
    "Media brief or creative brief": 0.9,
    "Competitive or market research synthesis": 1.0,
    "Campaign reporting or performance summary": 1.0,
    "Audience segmentation or persona draft": 0.9,
    "None of these yet": 0
  };
  var s0Pts = 0;
  s0.forEach(function(opt) {
    if (s0Map[opt]) s0Pts += s0Map[opt];
  });
  var s0Score = Math.min(2.8, s0Pts);
  breakdown.s0_outputs = Math.round(s0Score * 10) / 10;
  total += s0Score;

  var s1Map = {
    "Use role/context-rich prompts (beyond basic ask/answer)": 0.9,
    "Use AI with documents or data to produce analysis or recommendations": 1.4,
    "Turn AI output into deliverables shared with others": 1.4,
    "Use AI as part of recurring workflows": 1.2,
    "Connect AI to other tools or automations": 1.7,
    "Write code that calls AI APIs": 1.8,
    "Build custom tools/apps powered by AI": 2.2
  };
  var s1Pts = 0;
  s1.forEach(function(opt) {
    if (s1Map[opt]) s1Pts += s1Map[opt];
  });
  var s1Score = Math.min(4.8, s1Pts);
  breakdown.s1_activities = Math.round(s1Score * 10) / 10;
  total += s1Score;

  if (a.c1 === "Deep end — agents, APIs, vibe coding, the works") {
    var c1EvidenceSignals = [
      "Use AI with documents or data to produce analysis or recommendations",
      "Turn AI output into deliverables shared with others",
      "Use AI as part of recurring workflows",
      "Connect AI to other tools or automations",
      "Write code that calls AI APIs",
      "Build custom tools/apps powered by AI"
    ];
    var c1EvidenceCount = c1EvidenceSignals.filter(function(opt) {
      return s1.indexOf(opt) >= 0;
    }).length;
    if (c1EvidenceCount === 0) {
      var cappedC1 = Math.min(c1Score, 0.8);
      if (cappedC1 < c1Score) {
        total += cappedC1 - c1Score;
        breakdown.c1_readiness = cappedC1;
        breakdown.c1_overclaim_adjustment = Math.round((cappedC1 - c1Score) * 10) / 10;
      }
    }
  }

  var nonDevAdvancedOptions = [
    "Use AI with documents or data to produce analysis or recommendations",
    "Turn AI output into deliverables shared with others",
    "Use AI as part of recurring workflows",
    "Connect AI to other tools or automations"
  ];
  var nonDevAdvancedCount = nonDevAdvancedOptions.filter(function(opt) {
    return s1.indexOf(opt) >= 0;
  }).length;
  var hasCodingBuildSignal = s1.indexOf("Write code that calls AI APIs") >= 0 || s1.indexOf("Build custom tools/apps powered by AI") >= 0;
  var nonDevExpertBonus = 0;
  if (nonDevAdvancedCount >= 3 && !hasCodingBuildSignal) {
    nonDevExpertBonus = 0.8;
  } else if (nonDevAdvancedCount >= 4) {
    nonDevExpertBonus = 0.4;
  }
  if (nonDevExpertBonus > 0) {
    breakdown.non_dev_advanced_bonus = nonDevExpertBonus;
    total += nonDevExpertBonus;
  }

  return {
    total: Math.round(total * 10) / 10,
    breakdown: breakdown
  };
}

function rescorePayload(payload) {
  if (!payload || typeof payload !== "object" || !payload.responses || typeof payload.responses !== "object") {
    return payload;
  }
  var scoreData = computeRevisedScoreFromResponses(payload.responses);
  var tier = computeTierFromScore(scoreData.total);
  return Object.assign({}, payload, {
    scoreModel: "revised_v1",
    score: scoreData.total,
    scoreBreakdown: scoreData.breakdown,
    tier: tier.name,
    tierLabel: tier.label,
    tierDesc: tier.desc,
    trackRecommendation: trackRecommendationForTier(tier.name)
  });
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
      if (!isAuthorizedAdmin(req)) {
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

  if (req.method === "DELETE") {
    try {
      if (!isAuthorizedAdmin(req)) {
        return json(res, 401, { error: "Unauthorized" });
      }

      var id = (req.query && req.query.id ? String(req.query.id) : "").trim();
      if (!id) {
        return json(res, 400, { error: "Missing id" });
      }

      var submissions = await loadSubmissions();
      var nextRows = submissions.filter(function(row) {
        return !(row && String(row.id || "").trim() === id);
      });

      if (nextRows.length === submissions.length) {
        return json(res, 404, { error: "Submission not found" });
      }

      await saveSubmissions(nextRows);
      return json(res, 200, { ok: true, deletedId: id, count: nextRows.length });
    } catch (err3) {
      return json(res, 500, {
        error: "Failed to delete submission",
        details: err3 && err3.message ? err3.message : "Unknown error"
      });
    }
  }

  if (req.method === "PUT") {
    try {
      if (!isAuthorizedAdmin(req)) {
        return json(res, 401, { error: "Unauthorized" });
      }

      var body = req.body || {};
      if (body.action === "rescore_all") {
        var allRows = await loadSubmissions();
        var nowIsoAll = toIsoNow();
        var rescoredCount = 0;
        var skippedCount = 0;
        var nextRows = allRows.map(function(row) {
          if (!row || typeof row !== "object") {
            skippedCount += 1;
            return row;
          }
          var existingPayload = row.payload && typeof row.payload === "object" ? row.payload : null;
          if (!existingPayload || !existingPayload.responses || typeof existingPayload.responses !== "object") {
            skippedCount += 1;
            return row;
          }
          var nextPayload = rescorePayload(existingPayload);
          rescoredCount += 1;
          return Object.assign({}, row, {
            updatedAt: nowIsoAll,
            payload: nextPayload,
            fingerprint: createResponseFingerprint(nextPayload.responses)
          });
        });

        await saveSubmissions(nextRows);
        return json(res, 200, {
          ok: true,
          action: "rescore_all",
          count: nextRows.length,
          rescored: rescoredCount,
          skipped: skippedCount
        });
      }

      var id = String(body.id || (req.query && req.query.id) || "").trim();
      var payload = body.payload;
      if (!id) {
        return json(res, 400, { error: "Missing id" });
      }
      if (!payload || typeof payload !== "object" || !payload.responses || typeof payload.responses !== "object") {
        return json(res, 400, { error: "Invalid payload" });
      }

      var submissions = await loadSubmissions();
      var index = submissions.findIndex(function(row) {
        return row && String(row.id || "").trim() === id;
      });
      if (index < 0) {
        return json(res, 404, { error: "Submission not found" });
      }

      var existing = submissions[index] || {};
      var nowIso = toIsoNow();
      var respondentKey = normalizeRespondentKey(payload.respondentKey || existing.respondentKey || "");
      var fingerprint = createResponseFingerprint(payload.responses);
      submissions[index] = {
        id: id,
        respondentKey: respondentKey,
        fingerprint: fingerprint,
        createdAt: existing.createdAt || nowIso,
        updatedAt: nowIso,
        receivedAt: existing.receivedAt || existing.createdAt || nowIso,
        payload: payload
      };

      await saveSubmissions(submissions);
      return json(res, 200, { ok: true, id: id, updated: true });
    } catch (err4) {
      return json(res, 500, {
        error: "Failed to update submission",
        details: err4 && err4.message ? err4.message : "Unknown error"
      });
    }
  }

  res.setHeader("Allow", "GET, POST, DELETE, PUT");
  return json(res, 405, { error: "Method not allowed" });
};
