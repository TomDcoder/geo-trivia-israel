import { getStore } from "@netlify/blobs";

const KEY = "content.json";
const STORE = "trivia-content";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, PUT, OPTIONS"
    }
  });

const QUESTION_KEYS = [
  "BEGINNER", "INTERMEDIATE", "ADVANCED",
  "CAP_BEGINNER", "CAP_MID", "CAP_EXPERT",
  "WW2_BEGINNER", "WW2_MID", "WW2_EXPERT",
  "EVT_BEGINNER", "EVT_MID", "EVT_EXPERT"
];
const ERA_KEYS = ["ERA_BEGINNER_PERIODS", "ERA_MID_PERIODS", "ERA_EXPERT_PERIODS"];

function checkQuestions(list, where, errs) {
  if (!Array.isArray(list)) { errs.push(where + ": not an array"); return; }
  list.forEach((q, i) => {
    const at = where + "[" + i + "]";
    if (!q || typeof q !== "object") return errs.push(at + ": not an object");
    if (typeof q.q !== "string" || !q.q.trim()) errs.push(at + ": empty question");
    if (!Array.isArray(q.a) || q.a.length !== 4) errs.push(at + ": needs exactly 4 answers");
    else if (q.a.some((x) => typeof x !== "string" || !x.trim())) errs.push(at + ": blank answer");
    if (!Number.isInteger(q.c) || q.c < 0 || q.c > 3) errs.push(at + ": correct index out of range");
  });
}

function validate(c) {
  const errs = [];
  if (!c || typeof c !== "object") return ["content missing"];
  QUESTION_KEYS.forEach((k) => checkQuestions(c[k], k, errs));
  ERA_KEYS.forEach((k) => {
    if (!Array.isArray(c[k])) return errs.push(k + ": not an array");
    c[k].forEach((tier, i) => checkQuestions(tier, k + "[" + i + "]", errs));
  });
  if (!c.HINTS || typeof c.HINTS !== "object") errs.push("HINTS missing");
  if (!Array.isArray(c.REGIONS)) errs.push("REGIONS: not an array");
  if (!Array.isArray(c.PERIODS)) errs.push("PERIODS: not an array");
  ["PRAISE_M", "PRAISE_F", "WORLD_PRAISE_M", "WORLD_PRAISE_F", "CAP_PRAISE_M", "CAP_PRAISE_F"].forEach((k) => {
    if (!Array.isArray(c[k]) || !c[k].length) errs.push(k + ": needs at least one message");
  });
  return errs.slice(0, 20);
}

export default async (req, context) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  const store = getStore({ name: STORE, consistency: "strong" });

  if (req.method === "GET") {
    const doc = await store.get(KEY, { type: "json" });
    if (!doc) return json({ empty: true, revision: 0 });
    return json(doc);
  }

  if (req.method === "PUT" || req.method === "POST") {
    const user = context && context.clientContext && context.clientContext.user;
    if (!user) return json({ error: "unauthorized", message: "נדרשת התחברות כדי לשמור תוכן" }, 401);

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: "bad-json" }, 400); }

    const errs = validate(body && body.content);
    if (errs.length) return json({ error: "invalid", details: errs }, 422);

    const prev = await store.get(KEY, { type: "json" });
    const prevRev = (prev && prev.revision) || 0;
    if (body.baseRevision != null && Number(body.baseRevision) !== prevRev) {
      return json({ error: "conflict", revision: prevRev, updatedBy: prev && prev.updatedBy }, 409);
    }

    const who = user.email || (user.user_metadata && user.user_metadata.full_name) || "עורך";
    const doc = {
      revision: prevRev + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: who,
      note: typeof body.note === "string" ? body.note.slice(0, 140) : "",
      content: body.content
    };
    if (prev) { try { await store.setJSON("backup-" + prevRev + ".json", prev); } catch (e) {} }
    await store.setJSON(KEY, doc);
    return json({ ok: true, revision: doc.revision, updatedAt: doc.updatedAt, updatedBy: doc.updatedBy });
  }

  return json({ error: "method-not-allowed" }, 405);
};
