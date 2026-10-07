// Diagnose direct fetch behavior + test browser-like headers against blocked sites
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const SITES = [
  "https://www.daad.de/en/",
  "https://www.apply.abertay.ac.uk/",
  "https://www.chevening.org/scholarships/",
  "https://afterschoolafrica.com/",
  "https://www.studying-in-germany.org/",
  "https://www.mastersportal.com/",
  "https://applyweb.com/",
  "https://opportunitydesk.org/",
];

const MINIMAL = {
  "user-agent": UA,
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
};

const FULL = {
  "user-agent": UA,
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

async function probe(url, headers, label) {
  try {
    const r = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(20000) });
    const body = await r.text();
    const challenge = /just a moment|challenge-platform|cf-browser-verification|enable javascript and cookies|__cf_chl/i.test(body.slice(0, 3000));
    return `${r.status} ${String(body.length).padStart(7)}B ${challenge ? "CHALLENGE" : "OK     "} [${label}]`;
  } catch (e) {
    return `ERR  ${String(e && e.cause ? e.cause.code || e.cause.message : e.message).slice(0, 40).padEnd(40)} [${label}]`;
  }
}

for (const s of SITES) {
  const a = await probe(s, MINIMAL, "minimal");
  const b = await probe(s, FULL, "full-br");
  console.log(s);
  console.log("   ", a);
  console.log("   ", b);
}
