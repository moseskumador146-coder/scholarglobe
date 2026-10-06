#!/bin/bash
# Final verification v4 — tab activation via full pointer event sequence
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
agent-browser wait 2500

echo "--- run search ---"
agent-browser find role button click --name "Deep Search" >/dev/null
sleep 25
agent-browser eval "Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent.trim()).join(' | ')"

echo "--- activate PAIRS tab via pointer sequence ---"
agent-browser eval "(() => { const t = Array.from(document.querySelectorAll('[role=tab]')).find(t=>t.textContent.includes('Apply to both')); if (!t) return 'no tab'; for (const type of ['pointerdown','mousedown','mouseup','click']) t.dispatchEvent(new MouseEvent(type, {bubbles:true, cancelable:true, view:window})); return 'dispatched'; })()"
sleep 2
agent-browser eval "(() => { const active = document.querySelector('[role=tab][data-state=active]')?.textContent.trim(); const cards = (document.body.innerText.match(/Apply to both — the safe combo/g)||[]).length; const chips = (document.body.innerText.match(/Fund it with — linked scholarships/g)||[]).length; const free = (document.body.innerText.match(/BOTH applications free/g)||[]).length; const cb = document.querySelectorAll('button[role=checkbox]').length; return JSON.stringify({active, cards, chips, free, checkboxes: cb}); })()"

agent-browser screenshot scripts/verify6-pairs.png

echo "--- tick first checkbox + persistence ---"
agent-browser eval "document.querySelector('button[role=checkbox]')?.scrollIntoView({block:'center'})"
sleep 1
tickref=$(agent-browser snapshot -i 2>/dev/null | grep -iE "checkbox" | grep -oE "@e[0-9]+" | head -1)
echo "checkbox ref: ${tickref:-none}"
if [ -n "${tickref:-}" ]; then
  agent-browser click "$tickref"
  sleep 1
  echo "state after tick: $(agent-browser eval "document.body.innerText.match(/[01]\\/2 done|Both done!/g)?.join(',')")"
  agent-browser reload >/dev/null
  agent-browser wait --load networkidle
  sleep 2
  agent-browser find role button click --name "Deep Search" >/dev/null
  sleep 18
  agent-browser eval "(() => { const t = Array.from(document.querySelectorAll('[role=tab]')).find(t=>t.textContent.includes('Apply to both')); for (const type of ['pointerdown','mousedown','click']) t.dispatchEvent(new MouseEvent(type, {bubbles:true})); return 'ok'; })()" >/dev/null
  sleep 2
  after=$(agent-browser eval "document.body.innerText.match(/[01]\\/2 done|Both done!/g)?.join(',')")
  echo "after reload: $after"
  [ "$after" = "1/2 done" ] && echo "CHECKLIST-PERSIST-OK" || echo "CHECKLIST-PERSIST-FAIL"
fi

echo "--- open university dialog inside pairs (related section) ---"
agent-browser eval "(() => { const btns = Array.from(document.querySelectorAll('button')).filter(b=>b.textContent.includes('How to apply')); const uniBtn = btns[0]; uniBtn?.click(); return 'total: ' + btns.length; })()"
sleep 2
agent-browser eval "(() => { const dlg = document.querySelector('[role=dialog]'); if (!dlg) return 'no dialog'; const t = dlg.textContent; const rel = t.includes('Fund it with (linked scholarships)') || t.includes('Apply at (linked universities)'); return (rel ? 'DIALOG-RELATED-OK' : 'DIALOG-NO-RELATED') + ' | ' + (t.match(/RWTH|Deutschlandstipendium|Heinrich/)?.[0]||'?'); })()"
agent-browser press Escape >/dev/null; sleep 1

echo "--- web tab ---"
agent-browser eval "(() => { const t = Array.from(document.querySelectorAll('[role=tab]')).find(t=>t.textContent.includes('Deep web')); for (const type of ['pointerdown','mousedown','click']) t.dispatchEvent(new MouseEvent(type, {bubbles:true})); return 'ok'; })()" >/dev/null
sleep 2
agent-browser eval "(() => JSON.stringify({briefing: document.body.innerText.includes('AI briefing for Ghana'), freeTags: (document.body.innerText.match(/free \\/ waiver mentioned/g)||[]).length, feeTags: (document.body.innerText.match(/fee amounts mentioned/g)||[]).length}))()"
agent-browser screenshot scripts/verify6-web.png

echo "--- mobile re-check ---"
agent-browser set viewport 390 844
agent-browser open http://localhost:3000 >/dev/null
agent-browser wait --load networkidle
agent-browser wait 2500
agent-browser eval "(() => JSON.stringify({horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2, width: document.documentElement.scrollWidth}))()"
agent-browser screenshot scripts/verify6-mobile.png

echo "--- errors ---"
agent-browser errors | head -6
agent-browser close
echo "=== V4 DONE ==="
