/**
 * ScholarGlobe Co-Pilot — injected into every page served through /api/browse.
 * Runs same-origin with the app, so it keeps the browser chrome in sync:
 *   • reports SPA navigation (pushState/replaceState/popstate) to the parent
 *   • redirects window.open() / target=_blank clicks into a new Co-Pilot tab
 * The Co-Pilot panel reads forms/screen directly via contentDocument —
 * this script only handles things the parent cannot see.
 */
(function () {
  if (window.__SG_COPILOT__) return;
  window.__SG_COPILOT__ = true;

  var TAB = "";
  try {
    var me = document.currentScript;
    if (me) {
      TAB = me.getAttribute("data-sg-tab") || "";
      var finalUrl = me.getAttribute("data-sg-final");
      if (finalUrl) {
        window.__SG_FINAL_URL__ = finalUrl;
        try { history.replaceState(history.state, "", finalUrl); } catch (e) {}
      }
    }
  } catch (e) {}

  function post(msg) {
    try {
      msg.source = "sg-copilot-page";
      msg.tab = TAB;
      parent.postMessage(msg, window.location.origin);
    } catch (e) {}
  }

  function reportNav() {
    post({ type: "nav", url: window.__SG_FINAL_URL__ || location.href, title: document.title || "" });
  }

  window.addEventListener("load", reportNav);
  document.addEventListener("DOMContentLoaded", reportNav);

  try {
    var _push = history.pushState.bind(history);
    history.pushState = function () {
      var r = _push.apply(null, arguments);
      reportNav();
      return r;
    };
    var _replace = history.replaceState.bind(history);
    history.replaceState = function () {
      var r = _replace.apply(null, arguments);
      reportNav();
      return r;
    };
    window.addEventListener("popstate", reportNav);
  } catch (e) {}

  // new-tab interception (JS-created links + window.open)
  document.addEventListener(
    "click",
    function (e) {
      try {
        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a) return;
        var href = a.getAttribute("href") || "";
        if (/^(data:|javascript:|mailto:|tel:|#)/i.test(href)) return;
        if (a.target && a.target !== "_self") {
          e.preventDefault();
          post({ type: "newtab", url: a.href });
        }
      } catch (err) {}
    },
    true
  );

  try {
    var _open = window.open;
    window.open = function (u) {
      try {
        var abs = u ? new URL(String(u), location.href).toString() : location.href;
        post({ type: "newtab", url: abs });
      } catch (e) {}
      return null;
    };
    void _open;
  } catch (e) {}
})();
