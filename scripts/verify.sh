#!/usr/bin/env bash
# Verify command for home-app coursework deliverables.
# Checks: expected docs exist, are non-empty, carry no unresolved markers, and are in English.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
note() { printf '  %s\n' "$1"; }

# Assignment titles as stated by the team on 2026-09-16 (see docs/research/pivot-brief-2026-09-16.md).
declare -A DOCS=(
  ["docs/sis/assignment-1-stakeholder-expectations.md"]="Assignment 1. List of stakeholder's expectations"
  ["docs/sis/assignment-2-idea-and-feature-list.md"]="Assignment 2. Idea list, initial feature list"
  ["docs/sis/assignment-3-weekly-plan-fact-report.md"]="Assignment 3. Weekly Plan & Fact Report"
)

echo "== deliverables =="
for f in $(printf '%s\n' "${!DOCS[@]}" | sort); do
  if [[ ! -f "$f" ]]; then
    note "MISSING  $f  (${DOCS[$f]})"; fail=1; continue
  fi
  if [[ ! -s "$f" ]]; then
    note "EMPTY    $f"; fail=1; continue
  fi
  note "ok       $f"
done

echo "== unresolved markers =="
if grep -rnE '\b(TODO|TBD|FIXME|XXX|\?\?\?)\b' docs/sis 2>/dev/null; then
  note "unresolved markers found above"; fail=1
else
  note "none"
fi

echo "== English-only check (submissions) =="
if grep -rnP '[\x{0400}-\x{04FF}]' docs/sis 2>/dev/null; then
  note "Cyrillic found in a submission document (must be English)"; fail=1
else
  note "clean"
fi

echo
if [[ $fail -eq 0 ]]; then echo "VERIFY: PASS"; else echo "VERIFY: FAIL"; fi
exit $fail
