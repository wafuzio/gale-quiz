var createClient = require("redis").createClient;

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
  await client.rPush("galeQuizSubmissions", JSON.stringify(record));
}

async function redisGetSubmissions() {
  var client = await getRedisClient();
  if (!client) throw new Error("Missing REDIS_URL");
  var rows = await client.lRange("galeQuizSubmissions", 0, -1);
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

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    try {
      var body = req.body || {};
      if (!body.responses || typeof body.responses !== "object") {
        return json(res, 400, { error: "Invalid submission payload" });
      }

      var id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      var record = {
        id: id,
        receivedAt: new Date().toISOString(),
        payload: body
      };

      if (hasRedisUrl()) {
        await redisAppendSubmission(record);
      } else {
        var all = await kvGet("galeQuizSubmissions");
        var submissions = Array.isArray(all) ? all : [];
        submissions.push(record);
        await kvSet("galeQuizSubmissions", submissions);
      }

      return json(res, 200, { ok: true, id: id });
    } catch (err) {
      return json(res, 500, {
        error: "Submission storage failed",
        details: err && err.message ? err.message : "Unknown error"
      });
    }
  }

  if (req.method === "GET") {
    try {
      var adminKey = process.env.SUBMISSIONS_ADMIN_KEY;
      if (adminKey) {
        var supplied = req.headers["x-admin-key"] || req.query.key;
        if (supplied !== adminKey) {
          return json(res, 401, { error: "Unauthorized" });
        }
      }

      var allData = hasRedisUrl() ? await redisGetSubmissions() : await kvGet("galeQuizSubmissions");
      var rows = Array.isArray(allData) ? allData : [];
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
