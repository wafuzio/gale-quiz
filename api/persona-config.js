var createClient = require("redis").createClient;

var STORE_KEY = "galeQuizPersonaConfig";
var DEFAULT_ADMIN_KEYS = ["gimmethosetokens", "maxtokens"];

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

async function redisGetConfig() {
  var client = await getRedisClient();
  if (!client) throw new Error("Missing REDIS_URL");
  var raw = await client.get(STORE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function redisSetConfig(config) {
  var client = await getRedisClient();
  if (!client) throw new Error("Missing REDIS_URL");
  await client.set(STORE_KEY, JSON.stringify(config));
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

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidPersonaConfig(value) {
  if (!value || typeof value !== "object") return false;
  if (!Array.isArray(value.personaGrid) || value.personaGrid.length !== 4) return false;

  var valid = true;
  value.personaGrid.forEach(function(row) {
    if (!Array.isArray(row) || row.length !== 5) {
      valid = false;
      return;
    }
    row.forEach(function(persona) {
      if (!persona || typeof persona !== "object") {
        valid = false;
        return;
      }
      if (!isNonEmptyString(persona.name)) valid = false;
      if (!isNonEmptyString(persona.emoji)) valid = false;
      if (!isNonEmptyString(persona.spotlight)) valid = false;
      if (!isNonEmptyString(persona.superpower)) valid = false;
      if (!isNonEmptyString(persona.nextMove)) valid = false;
      if (!isNonEmptyString(persona.mantra)) valid = false;
    });
  });
  return valid;
}

function defaultPersonaConfig() {
  return {
    version: 1,
    personaGrid: [
      [
        { name: "Quick Study", emoji: "📚", spotlight: "You’re in the build-up phase where practical habits start compounding.", superpower: "You turn curiosity into action quickly once a workflow feels useful.", nextMove: "Pick one recurring task and turn it into your first reliable AI routine.", mantra: "Start simple. Repeat often." },
        { name: "Insight Scout", emoji: "🔎", spotlight: "You naturally look for patterns before trying to force output.", superpower: "You spot where better inputs can create smarter decisions.", nextMove: "Run one weekly analysis workflow and track quality gains over time.", mantra: "Clarity before velocity." },
        { name: "Creative Spark", emoji: "⚡️", spotlight: "You unlock momentum through ideas, messaging, and fast exploration.", superpower: "You can generate multiple angles quickly when direction is still forming.", nextMove: "Template your top two creative prompts so they become repeatable assets.", mantra: "Explore wide, refine fast." },
        { name: "Plan Starter", emoji: "🧭", spotlight: "You’re already framing work in steps, which is ideal for AI growth.", superpower: "You break ambiguity into actionable sequences.", nextMove: "Convert one planning process into a reusable AI-assisted checklist.", mantra: "Structure creates confidence." },
        { name: "Curious Drifter", emoji: "🍃", spotlight: "You’re at the starting line with a clear runway ahead.", superpower: "You’re approaching AI without baggage — ready to build the right habits from the start.", nextMove: "Choose a single use case to deepen so results become more consistent.", mantra: "Experiment with intent." }
      ],
      [
        { name: "Tinkerer", emoji: "👷", spotlight: "You’ve moved from trial to repeatable execution in core workflows.", superpower: "You can improve a process incrementally without overcomplicating it.", nextMove: "Automate one handoff in your weekly workflow and measure the time saved.", mantra: "Tune the machine." },
        { name: "Evidence Driver", emoji: "🕵️", spotlight: "You balance output speed with decision quality in practical ways.", superpower: "You build trust by grounding AI outputs in evidence and checks.", nextMove: "Add a standard verification pass to every high-visibility deliverable.", mantra: "Proof scales trust." },
        { name: "Story Crafter", emoji: "✍️", spotlight: "You’re strong at translating raw ideas into clear communication.", superpower: "You can rapidly shape drafts into audience-ready narratives.", nextMove: "Build a prompt kit for your top communication formats.", mantra: "Message with purpose." },
        { name: "Execution Mapper", emoji: "📌", spotlight: "You use AI to organize execution and reduce coordination friction.", superpower: "You convert strategy into concrete steps teams can actually run.", nextMove: "Create one planning workflow that starts with goals and ends with owners.", mantra: "Plan, then ship." },
        { name: "Momentum Explorer", emoji: "🚀", spotlight: "You’re sampling the landscape and starting to find your lanes.", superpower: "You’ve tested enough to know what’s possible — now it’s about picking where to go deep.", nextMove: "Prioritize the 2 highest-impact use cases and deepen consistency there.", mantra: "Momentum with direction." }
      ],
      [
        { name: "Automation Engineer", emoji: "🦾", spotlight: "You’re turning scattered wins into repeatable systems.", superpower: "You can orchestrate tools and prompts into dependable flows.", nextMove: "Document one end-to-end workflow so others can run it reliably.", mantra: "Build for repeatability." },
        { name: "Decision Analyst", emoji: "🧠", spotlight: "You're developing a reliable instinct for when data needs to drive the decision.", superpower: "You combine synthesis and evidence to strengthen how you frame recommendations.", nextMove: "Scale your analysis patterns into templates the wider team can reuse.", mantra: "Insight into action." },
        { name: "Narrative Producer", emoji: "🎬", spotlight: "You bring creative range and are building the systems to make it consistent.", superpower: "You can move from concept to polished output and are learning to protect quality at speed.", nextMove: "Create a quality rubric for fast content review before publishing.", mantra: "Creative, but controlled." },
        { name: "Operations Strategist", emoji: "🗺️", spotlight: "You use AI to coordinate execution across moving parts.", superpower: "You design practical systems that reduce chaos and improve throughput.", nextMove: "Introduce one lightweight orchestration board for AI-assisted workflows.", mantra: "Orchestrate the flow." },
        { name: "Versatility Navigator", emoji: "🌐", spotlight: "You're actively engaged across multiple AI use cases and adapting tools to fit each context.", superpower: "You pull from multiple approaches and adapt quickly — your range is becoming a real asset.", nextMove: "Pick one specialty lane to deepen without losing your broad range.", mantra: "Range with precision." }
      ],
      [
        { name: "Orchestration Architect", emoji: "🤖", spotlight: "You’re operating at systems level with strong automation instincts.", superpower: "You design workflows that scale beyond one-off personal productivity.", nextMove: "Package your strongest system into a team-ready playbook.", mantra: "Architect the leverage." },
        { name: "Intelligence Director", emoji: "🎯", spotlight: "You lead with evidence and quality control under real delivery pressure.", superpower: "You raise decision quality while maintaining execution speed.", nextMove: "Standardize QA checkpoints that others can adopt consistently.", mantra: "Rigor is a multiplier." },
        { name: "Creative Systems Lead", emoji: "🌟", spotlight: "You unify creative experimentation with dependable process.", superpower: "You can scale content and ideation without losing brand coherence.", nextMove: "Codify your creative operating system for cross-team reuse.", mantra: "Create at scale." },
        { name: "Workflow Commander", emoji: "🏛️", spotlight: "You transform complexity into clear, runnable execution systems.", superpower: "You align people, process, and AI into coherent delivery engines.", nextMove: "Design one flagship workflow with ownership, metrics, and guardrails.", mantra: "Command with clarity." },
        { name: "Adaptive Polymath", emoji: "🥷", spotlight: "You're operating at a high level across multiple AI domains — building, analyzing, creating, and orchestrating.", superpower: "You read the situation and deploy the right AI approach for the context, without defaulting to one lane.", nextMove: "Mentor peers by sharing your top decision patterns and templates.", mantra: "Adapt, then elevate." }
      ]
    ]
  };
}

async function loadConfig() {
  var value = null;
  try {
    value = hasRedisUrl() ? await redisGetConfig() : await kvGet(STORE_KEY);
  } catch (err) {
    value = null;
  }
  if (isValidPersonaConfig(value)) return value;
  return defaultPersonaConfig();
}

async function saveConfig(config) {
  if (hasRedisUrl()) {
    await redisSetConfig(config);
    return;
  }
  await kvSet(STORE_KEY, config);
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      var config = await loadConfig();
      return json(res, 200, config);
    } catch (err) {
      return json(res, 500, {
        error: "Failed to read persona config",
        details: err && err.message ? err.message : "Unknown error"
      });
    }
  }

  if (req.method === "PUT") {
    try {
      if (!isAuthorizedAdmin(req)) {
        return json(res, 401, { error: "Unauthorized" });
      }
      var body = req.body || {};
      if (!isValidPersonaConfig(body)) {
        return json(res, 400, { error: "Invalid persona config" });
      }
      await saveConfig(body);
      return json(res, 200, { ok: true, updated: true });
    } catch (err2) {
      return json(res, 500, {
        error: "Failed to update persona config",
        details: err2 && err2.message ? err2.message : "Unknown error"
      });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return json(res, 405, { error: "Method not allowed" });
};
