#!/bin/bash
# One-shot end-to-end verification for ScholarGlobe (server dies when this call ends;
# the platform restarts it at next session boot).
set -u
cd /home/z/my-project

echo "=== 1. Start dev server ==="
setsid bash -c 'bun run dev' </dev/null >/dev/null 2>&1 &
disown
ready=0
for i in $(seq 1 30); do
  sleep 2
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/stats" 2>/dev/null)
  if [ "$code" = "200" ]; then ready=1; echo "server ready after ~$((i*2))s"; break; fi
done
[ "$ready" = "1" ] || { echo "SERVER FAILED TO START"; tail -20 dev.log | grep -v "prisma:query"; exit 1; }

echo "=== 2. Stats API ==="
curl -s "http://localhost:3000/api/stats"
echo

echo "=== 3. Opportunities API (fee=low, masters) ==="
curl -s "http://localhost:3000/api/opportunities?fee=low&destination=all&level=masters" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('results:', d['count'], '| pairs:', len(d['pairs']))
for p in d['pairs'][:6]:
    print('  PAIR:', p['university']['name'][:44], '+', p['scholarship']['name'][:36], '| $', p['combinedFeeUsd'], '| open:', p['bothOpen'])
r=d['results'][0]
print('top:', r['name'], '| score:', r.get('matchScore'), '| related:', [(x['name'], x['feeConfirmedFree']) for x in r.get('related', [])])
print('fields check: slug=', r.get('slug'), 'feeUsd=', r.get('feeUsd'))
"
echo "=== 3b. fee=free filter ==="
curl -s "http://localhost:3000/api/opportunities?fee=free&destination=all" | python3 -c "import json,sys; d=json.load(sys.stdin); print('free-only count:', d['count'])"
echo "=== 3c. kind filter ==="
curl -s "http://localhost:3000/api/opportunities?fee=low&kind=UNIVERSITY" | python3 -c "import json,sys; d=json.load(sys.stdin); print('universities:', d['count'])"

echo "=== 4. Deep search API (Ghana -> Europe masters) ==="
curl -s -X POST "http://localhost:3000/api/deep-search" -H "Content-Type: application/json" \
  -d '{"origin":"Ghana","destination":"Europe","level":"masters","field":"any"}' --max-time 55 | python3 -c "
import json,sys
d=json.load(sys.stdin)
res=d.get('results',[])
print('web results:', len(res))
print('free-tagged:', sum(1 for r in res if r.get('freeMention')), '| fee-tagged:', sum(1 for r in res if r.get('feeMention')))
s=d.get('synthesis')
print('synthesis:', (s[:220]+'...') if s and len(s)>220 else s)
"

echo "=== 5. Browser verification ==="
agent-browser set viewport 1400 900
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser wait 2500
agent-browser get title
agent-browser screenshot scripts/verify2-hero.png

# hero should mention the new stats line
hero=$(agent-browser eval "document.body.innerText.slice(0,600)")
echo "$hero" | grep -o "universities ≤ \$30 to apply" && echo "HERO-STAT-OK" || echo "HERO-STAT-MISSING"
echo "$hero" | grep -o "uni↔scholarship links" && echo "HERO-LINKS-OK" || echo "HERO-LINKS-MISSING"

# run the deep search (button click) and wait
agent-browser find text "Deep Search" click
echo "clicked Deep Search; waiting for results..."
sleep 30
results_txt=$(agent-browser eval "document.body.innerText.slice(0,4000)")
echo "$results_txt" | grep -oE "Curated matches \([0-9]+\)" | head -1
echo "$results_txt" | grep -oE "Apply to both \([0-9]+\)" | head -1 && echo "PAIRS-TAB-OK" || echo "PAIRS-TAB-MISSING"
echo "$results_txt" | grep -oE "Deep web results \([0-9]+\)" | head -1

# click the pairs tab
agent-browser find text "Apply to both" click
sleep 2
pair_txt=$(agent-browser eval "document.body.innerText.slice(0,6000)")
echo "$pair_txt" | grep -o "Apply to both — the safe combo" | head -1 && echo "PAIR-CARD-OK" || echo "PAIR-CARD-MISSING"
echo "$pair_txt" | grep -o "BOTH applications free" | head -1 && echo "PAIR-FREE-OK" || echo "PAIR-FREE-NONE(fine)"
echo "$pair_txt" | grep -o "Fund it with — linked scholarships" | head -1 && echo "RELATED-CHIPS-OK" || echo "RELATED-CHIPS-MISSING"
agent-browser screenshot scripts/verify2-pairs.png

# tick one checklist checkbox to test persistence
agent-browser find first "label" click 2>/dev/null
sleep 1
agent-browser screenshot scripts/verify2-checklist.png

# globes section
agent-browser eval "document.querySelector('#globes')?.scrollIntoView()"
sleep 3
globes_txt=$(agent-browser eval "document.body.innerText.slice(2000,7000)")
echo "$globes_txt" | grep -o "Globe 1 — Universities: \$0 or ≤\$30 to apply" | head -1 && echo "GLOBE1-TITLE-OK" || echo "GLOBE1-TITLE-MISSING"
agent-browser screenshot scripts/verify2-globes.png

# console + errors
echo "--- console errors ---"
agent-browser errors | head -10
agent-browser close
echo "=== DONE ==="
