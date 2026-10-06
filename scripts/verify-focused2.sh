#!/bin/bash
# Focused verification v2 — semantic locators
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

echo "--- globe chips (should have counts) ---"
agent-browser eval "Array.from(document.querySelectorAll('#globes button')).slice(0,7).map(b=>b.textContent.trim()).join(' | ')"

echo "--- click Deep Search (semantic) ---"
agent-browser find role button click --name "Deep Search"
sleep 30

echo "--- tabs after search ---"
agent-browser eval "Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent.trim()).join(' | ')"

echo "--- activate pairs tab ---"
agent-browser eval "Array.from(document.querySelectorAll('[role=tab]')).find(t=>t.textContent.includes('Apply to both'))?.click()"
sleep 2
agent-browser eval "(() => { const active = document.querySelector('[role=tab][data-state=active]')?.textContent.trim(); const cards = (document.body.innerText.match(/Apply to both — the safe combo/g)||[]).length; const chips = (document.body.innerText.match(/Fund it with — linked scholarships/g)||[]).length; const free = (document.body.innerText.match(/BOTH applications free/g)||[]).length; const cb = document.querySelectorAll('button[role=checkbox]').length; return JSON.stringify({active, cards, chips, free, checkboxes: cb}); })()"

agent-browser screenshot scripts/verify4-pairs.png

echo "--- checklist persistence ---"
agent-browser eval "document.querySelector('button[role=checkbox]')?.click()"
sleep 1
agent-browser eval "document.body.innerText.match(/[01]\\/2 done|Both done!/)?.[0]" || true
state1=$(agent-browser storage local get sg-pair-e83 2>/dev/null; agent-browser eval "Object.keys(localStorage).filter(k=>k.startsWith('sg-pair')).map(k=>k+'='+localStorage[k]).join(', ') || 'none'")
echo "localStorage: $state1"
agent-browser reload
agent-browser wait --load networkidle
sleep 2
agent-browser eval "Array.from(document.querySelectorAll('[role=tab]')).find(t=>t.textContent.includes('Apply to both'))?.click()"
sleep 2
persist=$(agent-browser eval "document.body.innerText.match(/[01]\\/2 done|Both done!/)?.[0] || 'not-found'")
echo "after reload checklist shows: $persist"

agent-browser screenshot scripts/verify4-pairs-ticked.png

echo "--- open a How-to-apply dialog on first pair card (related section check) ---"
agent-browser eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('How to apply'))?.click()"
sleep 2
agent-browser eval "(() => { const dlg = document.querySelector('[role=dialog]'); return dlg ? (dlg.innerText.includes('Fund it with (linked scholarships)') ? 'DIALOG-RELATED-OK' : 'DIALOG-NO-RELATED') + ' | title: ' + (dlg.querySelector('h2,h1,[data-slot=dialog-title]')?.textContent||'').slice(0,60) : 'no dialog'; })()"
agent-browser press Escape
sleep 1

echo "--- web tab + AI briefing ---"
agent-browser eval "Array.from(document.querySelectorAll('[role=tab]')).find(t=>t.textContent.includes('Deep web'))?.click()"
sleep 2
agent-browser eval "(() => JSON.stringify({briefing: document.body.innerText.includes('AI briefing for Ghana'), freeTags: (document.body.innerText.match(/free \\/ waiver mentioned/g)||[]).length, feeTags: (document.body.innerText.match(/fee amounts mentioned/g)||[]).length}))()"
agent-browser screenshot scripts/verify4-web.png

echo "--- open-now & upcoming sections still fine ---"
agent-browser eval "(() => JSON.stringify({openNow: !!document.querySelector('#open-now'), upcoming: !!document.querySelector('#upcoming'), openCards: document.querySelectorAll('#open-now [class*=card], #open-now .space-y-4 > *').length}))()"

echo "--- footer sticky + errors ---"
agent-browser eval "getComputedStyle(document.querySelector('footer')).position"
agent-browser errors | head -6
agent-browser close
echo "=== V2 DONE ==="
