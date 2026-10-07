#!/bin/bash
# Test real sites through the Co-Pilot browser proxy to find concrete failures
BASE="http://localhost:3000"
SITES=(
  "https://www.chevening.org/scholarships/"
  "https://www.daad.de/en/"
  "https://opportunitydesk.org/"
  "https://www.opportunitiesforafricans.com/"
  "https://afterschoolafrica.com/"
  "https://www.ucas.com/"
  "https://www.studying-in-germany.org/"
  "https://scholarshiproar.com/"
  "https://www.scholars4dev.com/"
  "https://www.mastersportal.com/"
  "https://applyweb.com/"
  "https://www.apply.abertay.ac.uk/"
  "https://www.gov.uk/government/organisations/commonwealth-scholarship-commission-in-the-uk"
  "https://httpbin.org/forms/post"
  "https://example.com"
)
for s in "${SITES[@]}"; do
  enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$s")
  out=$(curl -s -o /tmp/sgtest.html -w "%{http_code}|%{time_total}|%{size_download}" --max-time 45 "$BASE/api/browse?tab=ttest&u=$enc")
  code="${out%%|*}"; rest="${out#*|}"; time="${rest%%|*}"; size="${rest##*|}"
  marker="?"
  if grep -q "copilot-inject.js" /tmp/sgtest.html 2>/dev/null; then marker="REWRITTEN"; fi
  if grep -q "did not respond\|could not be prepared\|not allowed" /tmp/sgtest.html 2>/dev/null; then marker="ERRPAGE"; fi
  if grep -qi "just a moment\|challenge-platform\|cf-browser-verification\|enable javascript and cookies" /tmp/sgtest.html 2>/dev/null; then marker="BOTBLOCK"; fi
  echo "$code | ${time}s | ${size}B | $marker | $s"
done
