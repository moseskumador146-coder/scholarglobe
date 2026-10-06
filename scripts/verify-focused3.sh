#!/bin/bash
# Final verification v3 — real clicks via snapshot refs
set -u
cd /home/z/my-project

setsid bash -c 'bun run dev' </dev/null >/dev/null 2>&1 &
disown
for i in $(seq 1 30); do
  sleep 2
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/stats" 2>/dev/null)
  [ "$code" = "200" ] && { echo "server ready"; break; }
done

agent-browser set viewport 1400 900
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser wait 3000

echo "--- continent chips (fixed) ---"
agent-browser eval "Array.from(document.querySelectorAll('#globes button')).slice(0,7).map(b=>b.textContent.trim()).join(' | ')"

echo "--- run search ---"
agent-browser find role button click --name "Deep Search"
sleep 25

echo "--- click pairs tab via REAL click (ref) ---"
pairref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE '@e[0-9]+.*Apply to both' | grep -oE '@e[0-9]+' | head -1)
echo "pairs tab ref: $pairref"
agent-browser click "$pairref"
sleep 2
agent-browser eval "(() => { const active = document.querySelector('[role=tab][data-state=active]')?.textContent.trim(); const cards = (document.body.innerText.match(/Apply to both — the safe combo/g)||[]).length; const chips = (document.body.innerText.match(/Fund it with — linked scholarships/g)||[]).length; const free = (document.body.innerText.match(/BOTH applications free/g)||[]).length; const cb = document.querySelectorAll('button[role=checkbox]').length; return JSON.stringify({active, cards, chips, free, checkboxes: cb}); })()"

agent-browser screenshot scripts/verify5-pairs.png

echo "--- tick first checkbox + persistence ---"
agent-browser eval "document.querySelector('button[role=checkbox]')?.scrollIntoView({block:'center'})"
sleep 1
cbref=$(agent-browser snapshot -i -c 2>/dev/null | grep -B2 -A2 "checkbox" | grep -oE '@e[0-9]+' | head -1)
echo "checkbox ref: $cbref"
[ -n "$cbref" ] && agent-browser click "$cbref"
sleep 1
echo "state after tick: $(agent-browser eval "document.body.innerText.match(/[01]\\/2 done|Both done!/g)?.join(',')")"
agent-browser reload
agent-browser wait --load networkidle
sleep 2
pairref2=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE '@e[0-9]+.*Apply to both' | grep -oE '@e[0-9]+' | head -1)
agent-browser click "$pairref2"
sleep 2
echo "after reload: $(agent-browser eval "document.body.innerText.match(/[01]\\/2 done|Both done!/g)?.join(',')")"
[ "$(agent-browser eval "document.body.innerText.match(/[01]\\/2 done|Both done!/g)?.[0]")" = "1/2 done" ] && echo "CHECKLIST-PERSIST-OK" || echo "CHECKLIST-PERSIST-CHECK"

echo "--- open a University pair-card dialog (related section inside dialog) ---"
agent-browser eval "(() => { const btns = Array.from(document.querySelectorAll('button')).filter(b=>b.textContent.includes('How to apply')); btns[0]?.click(); return 'clicked, total how-to buttons: ' + btns.length; })()"
sleep 2
agent-browser eval "(() => { const dlg = document.querySelector('[role=dialog]'); if (!dlg) return 'no dialog'; const hasRelated = dlg.innerText.includes('Fund it with (linked scholarships)') || dlg.innerText.includes('Apply at (linked universities)'); return (hasRelated ? 'DIALOG-RELATED-OK' : 'DIALOG-NO-RELATED') + ' | ' + (dlg.textContent.match(/RWTH|Deutschlandstipendium|TUM|Helsinki/)?.[0] || dlg.textContent.slice(0,50)); })()"
agent-browser press Escape
sleep 1

echo "--- web tab: AI briefing + fee tags ---"
webref=$(agent-browser snapshot -i -c 2>/dev/null | grep -oE '@e[0-9]+.*Deep web results' | grep -oE '@e[0-9]+' | head -1)
agent-browser click "$webref"
sleep 2
agent-browser eval "(() => JSON.stringify({briefing: document.body.innerText.includes('AI briefing for Ghana'), freeTags: (document.body.innerText.match(/free \\/ waiver mentioned/g)||[]).length, feeTags: (document.body.innerText.match(/fee amounts mentioned/g)||[]).length, results: (document.body.innerText.match(/Visit|official|scholarship/gi)||[]).length > 3}))()"
agent-browser screenshot scripts/verify5-web.png

echo "--- mobile viewport spot check ---"
agent-browser set viewport 390 844
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser wait 2500
agent-browser eval "(() => { const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2; return JSON.stringify({horizontalOverflow: overflow, width: document.documentElement.scrollWidth}); })()"
agent-browser screenshot scripts/verify5-mobile.png

echo "--- errors ---"
agent-browser errors | head -6
agent-browser close
echo "=== V3 DONE ==="
