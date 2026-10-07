/**
 * ScholarGlobe Co-Pilot — injected into every page served through /api/browse.
 * Runs same-origin with the app, so it keeps the browser chrome in sync and
 * keeps runtime traffic flowing through the proxy:
 *   • fetch()/XHR: absolute+relative URLs → proxy (SPA data loads work)
 *   • runtime-inserted <a>/<form>: action/href rewritten before navigation
 *   • pushState/replaceState: rewritten to proxy URLs (iframe stays readable)
 *   • window.open() / target=_blank clicks → new Co-Pilot tab
 * The Co-Pilot panel reads forms/screen directly via contentDocument —
 * this script only handles what the parent cannot see.
 */
(function () {
  if (window.__SG_COPILOT__) return;
  window.__SG_COPILOT__ = true;

  var TAB = "";
  var FINAL = "";
  try {
    var me = document.currentScript;
    if (me) {
      TAB = me.getAttribute("data-sg-tab") || "";
      FINAL = me.getAttribute("data-sg-final") || "";
      if (FINAL) window.__SG_FINAL_URL__ = FINAL;
    }
  } catch (e) {}

  function origin() {
    return window.location.origin;
  }

  /** absolute real URL for any raw value on this page */
  function toAbs(raw) {
    try {
      var u = new URL(String(raw), FINAL || location.href);
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    } catch (e) {}
    return null;
  }

  /** proxy URL for any raw value; null when it should not be touched */
  function prox(raw) {
    if (raw == null) return null;
    var val = String(raw).trim();
    if (!val || /^(data:|javascript:|mailto:|tel:|blob:|about:|#)/i.test(val)) return null;
    if (val.indexOf("/api/browse") === 0) return null;
    var abs = toAbs(val);
    if (!abs) return null;
    return (
      origin() +
      "/api/browse?tab=" +
      encodeURIComponent(TAB) +
      "&u=" +
      encodeURIComponent(abs)
    );
  }

  function post(msg) {
    try {
      msg.source = "sg-copilot-page";
      msg.tab = TAB;
      parent.postMessage(msg, origin());
    } catch (e) {}
  }

  function realUrl() {
    try {
      if (location.pathname === "/api/browse") {
        var inner = new URLSearchParams(location.search).get("u");
        if (inner) return inner;
      }
    } catch (e) {}
    return window.__SG_FINAL_URL__ || location.href;
  }

  function reportNav() {
    post({ type: "nav", url: realUrl(), title: document.title || "" });
  }

  window.addEventListener("load", reportNav);
  document.addEventListener("DOMContentLoaded", reportNav);

  // ── SPA routing: keep the iframe same-origin, report the real URL ──
  function rewriteStateArg(args) {
    try {
      var u = args && typeof args[2] !== "undefined" && args[2] !== null ? String(args[2]) : "";
      if (!u || u === location.href) return args;
      var p = prox(u);
      var abs = toAbs(u);
      if (abs) window.__SG_FINAL_URL__ = abs;
      if (p) {
        var a = [].slice.call(args);
        a[2] = p;
        return a;
      }
    } catch (e) {}
    return args;
  }
  try {
    var _push = history.pushState.bind(history);
    history.pushState = function () {
      var r = _push.apply(null, rewriteStateArg(arguments));
      reportNav();
      return r;
    };
    var _replace = history.replaceState.bind(history);
    history.replaceState = function () {
      var r = _replace.apply(null, rewriteStateArg(arguments));
      reportNav();
      return r;
    };
    window.addEventListener("popstate", reportNav);
  } catch (e) {}

  // ── runtime fetch()/XHR → proxy ────────────────────────────────────
  try {
    var _fetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        var url = null;
        var isReq = typeof input === "object" && input && typeof input.url === "string";
        url = isReq ? input.url : input;
        var p = prox(url);
        if (p) {
          if (isReq) {
            input = new Request(p, input);
          } else {
            input = p;
            init = init || {};
            init.headers = new Headers(init.headers || {});
            if (!init.headers.has("x-sg-fetch")) init.headers.set("x-sg-fetch", "1");
          }
        }
      } catch (e) {}
      return _fetch.call(window, input, init);
    };
  } catch (e) {}

  try {
    var _xo = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u) {
      try {
        var p = prox(u);
        if (p) {
          this.setRequestHeader("x-sg-fetch", "1");
          u = p;
        }
      } catch (e) {}
      return _xo.apply(this, [m, u].concat([].slice.call(arguments, 2)));
    };
  } catch (e) {}

  // ── click interception: keep navigation inside the proxy ──────────
  document.addEventListener(
    "click",
    function (e) {
      try {
        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a) return;
        if (a.closest(".sg-external")) return; // explicit "open outside" links
        var href = a.getAttribute("href") || "";
        if (/^(data:|javascript:|mailto:|tel:|#)/i.test(href)) return;
        if (a.target && a.target !== "_self") {
          e.preventDefault();
          var absNew = toAbs(href);
          if (absNew) post({ type: "newtab", url: absNew });
          return;
        }
        // same-tab: if the resolved href would escape the proxy, rewrite it
        var p = prox(href);
        if (p) a.setAttribute("href", p);
      } catch (err) {}
    },
    true
  );

  // ── runtime forms: rewrite actions on submit ───────────────────────
  document.addEventListener(
    "submit",
    function (e) {
      try {
        var f = e.target;
        if (!f || !f.tagName || f.tagName !== "FORM") return;
        var act = f.getAttribute("action") || "";
        if (!act) return; // posts to current URL — already proxied
        var p = prox(act);
        if (p) f.setAttribute("action", p);
      } catch (err) {}
    },
    true
  );

  // ── window.open → new Co-Pilot tab ─────────────────────────────────
  try {
    var _open = window.open;
    window.open = function (u) {
      try {
        var abs = toAbs(u || (window.__SG_FINAL_URL__ || location.href));
        if (abs) post({ type: "newtab", url: abs });
      } catch (e) {}
      return null;
    };
    void _open;
  } catch (e) {}
})();
