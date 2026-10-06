#!/bin/bash
# Focused verification: search flow + pairs tab + checklist persistence
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
agent-browser wait 2000

# find the Deep Search button ref
agent-browser snapshot -i -c 2>/dev/null | grep -iE "deep search|button" | head -8
ref=$(agent-browser snapshot -i --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
def walk(node):
    if isinstance(node, dict):
        if node.get('name','').strip().lower()=='deep search' and 'button' in str(node.get('role','')):
            return node.get('ref')
        for v in node.values():
            r = walk(v)
            if r: return r
    elif isinstance(node, list):
        for v in node:
            r = walk(v)
            if r: return r
    return None
print(walk(d) or '')
")
echo "button ref: $ref"
[ -n "$ref" ] && agent-browser click "$ref"
sleep 28

echo "--- tabs after search ---"
tabs=$(agent-browser eval "Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent).join(' | ')")
echo "$tabs"

# click the pairs tab via role
agent-browser eval "document.querySelectorAll('[role=tab]')[1]?.click()"
sleep 2
pairstate=$(agent-browser eval "document.querySelector('[data-state=active][role=tab]')?.textContent + ' ||| ' + (document.body.innerText.match(/Apply to both — the safe combo/g)||[]).length + ' pair cards | ' + (document.body.innerText.match(/Fund it with — linked scholarships/g)||[]).length + ' chip groups'")
echo "$pairstate"

agent-browser screenshot scripts/verify3-pairs.png

# checklist persistence test: tick first checkbox, reload, re-check
agent-browser eval "document.querySelector('[role=tab][data-state=active]')"
agent-browser find first "[role=dialog]" 2>/dev/null >/dev/null
cb=$(agent-browser eval "!!document.querySelector('button[role=checkbox]')")
echo "checkbox present: $cb"
if [ "$cb" = "True" ]; then
  agent-browser eval "document.querySelector('button[role=checkbox]').click()"
  sleep 1
  before=$(agent-browser eval "document.body.innerText.match(/[01]\\/2 done|Both done!/)?.[0]")
  agent-browser reload
  agent-browser wait --load networkidle
  sleep 2
  agent-browser eval "document.querySelectorAll('[role=tab]')[1]?.click()"
  sleep 2
  after=$(agent-browser eval "document.body.innerText.match(/[01]\\/2 done|Both done!/g)?.join(',')")
  echo "checklist before reload: $before | after reload: $after"
  [ "$after" = "1/2 done" ] && echo "CHECKLIST-PERSIST-OK" || echo "CHECKLIST-PERSIST-FAIL"
fi

agent-browser screenshot scripts/verify3-pairs-ticked.png

# open a pair card dialog (How to apply) to verify related section inside dialog
agent-browser find first "button" 2>/dev/null >/dev/null
dialog=$(agent-browser eval "(document.body.innerText.match(/Fund it with \\(linked scholarships\\)/g)||[]).length")
echo "dialog related sections: $dialog"

# web tab with AI briefing
agent-browser eval "document.querySelectorAll('[role=tab]')[2]?.click()"
sleep 2
webstate=$(agent-browser eval "document.body.innerText.includes('AI briefing for Ghana') ? 'BRIEFING-OK' : 'briefing-missing-or-empty'")
echo "$webstate"
agent-browser screenshot scripts/verify3-web.png

echo "--- console errors ---"
agent-browser errors | head -6
agent-browser close
echo "=== FOCUSED DONE ==="
