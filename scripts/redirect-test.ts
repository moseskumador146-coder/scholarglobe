// 1) Test bun fetch redirect:"manual" semantics (opaque-redirect or real headers?)
// 2) Test the browse-assist AI route
import http from "http";

const srv = http.createServer((req, res) => {
  if (req.url === "/start") {
    res.writeHead(302, { "set-cookie": ["session=abc123; Path=/", "token=xyz; Path=/"], location: "/final" });
    res.end();
  } else if (req.url === "/final") {
    const cookies = req.headers.cookie || "(none)";
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(`FINAL cookies: ${cookies}`);
  } else {
    res.writeHead(404); res.end("nf");
  }
});
await new Promise((r) => srv.listen(4599, r));

const manual = await fetch("http://localhost:4599/start", { redirect: "manual" });
console.log("manual:", manual.type, manual.status, [...manual.headers.keys()]);
try { console.log("manual set-cookie:", manual.headers.getSetCookie?.()); } catch {}

const follow = await fetch("http://localhost:4599/start", { redirect: "follow" });
console.log("follow body:", await follow.text());

// does undici exist as a package?
try {
  const u = await import("undici");
  console.log("undici available:", typeof u.request);
} catch (e) {
  console.log("undici package NOT available");
}

srv.close();

// 3) AI route test
try {
  const r = await fetch("http://localhost:3000/api/browse-assist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mode: "guide",
      pageText: "Commonwealth Master's Scholarships — apply online. Eligibility: citizens of eligible low and middle income countries with an undergraduate degree of upper second class or better. Deadline 15 October.",
      fields: [{ id: "f1", label: "Full name", type: "text", required: true }],
      appName: "Commonwealth Master's Scholarships",
    }),
  });
  const j = await r.json();
  console.log("assist status:", r.status, "keys:", Object.keys(j), "guide head:", String(j.guidance || j.error || "").slice(0, 120));
} catch (e) {
  console.log("assist ERR:", e.message);
}
