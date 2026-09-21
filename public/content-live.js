// Live content loader. Runs BEFORE content.js.
// Fetches /api/content (Netlify Blobs). Retries twice on network/5xx, then falls
// back to the content.js bundled with the page. Order-independent: TRIVIA_CONTENT
// is a property, so a late content.js load can never clobber cloud content.
(function () {
  if (window.__triviaLive) return;
  window.__triviaLive = true;
  var cloud = null, local = null;
  try {
    Object.defineProperty(window, "TRIVIA_CONTENT", {
      configurable: true,
      get: function () { return cloud || local; },
      set: function (v) { local = v; }
    });
  } catch (e) { return; }

  window.TRIVIA_CONTENT_PENDING = true;
  window.TRIVIA_SOURCE = "loading";
  window.TRIVIA_REVISION = 0;

  function settle(label) {
    window.TRIVIA_CONTENT_PENDING = false;
    window.TRIVIA_SOURCE = label;
    try { window.dispatchEvent(new Event("trivia-content")); } catch (e) {}
  }

  var tries = 0, MAX = 3;
  function attempt() {
    tries++;
    var ctl = null, timer = null;
    try { ctl = new AbortController(); } catch (e) {}
    if (ctl) timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, tries === 1 ? 2500 : 6000);
    fetch("/api/content", { headers: { accept: "application/json" }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (r.status === 404 || r.status === 501) { var e = new Error("no-api"); e.fatal = true; throw e; }
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function (doc) {
        if (timer) clearTimeout(timer);
        if (doc && doc.content && !doc.empty) {
          cloud = doc.content;
          window.TRIVIA_REVISION = doc.revision || 0;
          window.TRIVIA_UPDATED_AT = doc.updatedAt || "";
          settle("cloud");
        } else settle("local");
      })
      .catch(function (err) {
        if (timer) clearTimeout(timer);
        if (!err || err.fatal || tries >= MAX) return settle("local");
        setTimeout(attempt, tries * 700);
      });
  }
  attempt();
})();
