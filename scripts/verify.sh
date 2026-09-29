#!/usr/bin/env bash
# Single verify command for house-app.
#   bash scripts/verify.sh         # docs + code
#   bash scripts/verify.sh docs    # coursework deliverables only
#   bash scripts/verify.sh code    # typecheck + lint + backend tests
set -uo pipefail
cd "$(dirname "$0")/.."

scope="${1:-all}"
fail=0
note() { printf '  %s\n' "$1"; }

check_docs() {
  local f
  echo "== deliverables =="
  # Assignment titles as stated by the team on 2026-09-16
  # (see docs/research/pivot-brief-2026-09-16.md).
  # TSIS 1 and TSIS 2 are a single submission - see the course template.
  local -A DOCS=(
    ["docs/sis/tsis-01-02-project-initiation-idea-list.md"]="TSIS 1+2 Project Initiation and Idea List"
    ["docs/sis/assignment-3-weekly-plan-fact-report.md"]="Weekly Plan & Fact Report"
  )
  for f in $(printf '%s\n' "${!DOCS[@]}" | sort); do
    if   [[ ! -f "$f" ]]; then note "MISSING  $f  (${DOCS[$f]})"; fail=1
    elif [[ ! -s "$f" ]]; then note "EMPTY    $f"; fail=1
    else note "ok       $f"; fi
  done

  echo "== TSIS 1+2 mandatory sections =="
  local tsis="docs/sis/tsis-01-02-project-initiation-idea-list.md"
  if [[ -f "$tsis" ]]; then
    local sec
    for sec in "Project / Idea Description" "RACI Matrix" "List of Stakeholder's Expectations" \
               "Idea List" "Initial Features List" "AI Disclosure"; do
      if grep -qF "$sec" "$tsis"; then note "ok       $sec"; else note "MISSING  $sec"; fail=1; fi
    done
    # RACI rows are the numbered rows with 7 columns (task + 6 roles); the Idea
    # List is also numbered but has 3, so field count distinguishes them.
    local rows multi
    rows=$(awk -F'|' '/^\| [0-9]+ \|/ && NF==10' "$tsis" | wc -l)
    if (( rows >= 8 && rows <= 12 )); then
      note "ok       RACI has $rows tasks (template: 8-12)"
    else
      note "RACI has $rows tasks - template requires 8-12"; fail=1
    fi
    # The template requires exactly one Accountable per task.
    multi=$(awk -F'|' '/^\| [0-9]+ \|/ && NF==10 {
      n=0; for (i=3; i<=NF-1; i++) if ($i ~ /\*\*A\*\*/) n++
      if (n != 1) print $2 " has " n
    }' "$tsis")
    if [[ -z "$multi" ]]; then
      note "ok       exactly one Accountable per RACI task"
    else
      note "RACI rows without exactly one A:"; printf '    %s\n' "$multi"; fail=1
    fi
  fi

  echo "== unresolved markers =="
  if grep -rnE --include='*.md' '\b(TODO|TBD|FIXME|XXX)\b' docs/sis 2>/dev/null; then
    note "unresolved markers found above"; fail=1
  else note "none"; fi

  echo "== English-only check (submissions) =="
  if grep -rnP --include='*.md' '[\x{0400}-\x{04FF}]' docs/sis 2>/dev/null; then
    note "Cyrillic found in a submission document (must be English)"; fail=1
  else note "clean"; fi
}

check_code() {
  echo "== frontend typecheck =="
  if [[ ! -d node_modules ]]; then
    note "node_modules missing - run: pnpm install"; fail=1
  elif pnpm --filter web typecheck >/tmp/hv-tsc.log 2>&1; then
    note "ok"
  else
    note "FAILED:"; sed 's/^/    /' /tmp/hv-tsc.log | tail -25; fail=1
  fi

  echo "== backend lint =="
  if [[ ! -d apps/api/.venv ]]; then
    note "apps/api/.venv missing - run: pnpm --filter api setup"; fail=1
  elif (cd apps/api && uv run ruff check .) >/tmp/hv-ruff.log 2>&1; then
    note "ok"
  else
    note "FAILED:"; sed 's/^/    /' /tmp/hv-ruff.log | tail -25; fail=1
  fi

  echo "== backend tests (local Supabase; skipped if not running) =="
  # PYTHONPATH is cleared so a system-wide one (e.g. ROS) cannot inject
  # foreign pytest plugins into the venv.
  if [[ ! -d apps/api/.venv ]]; then
    note "apps/api/.venv missing - see above"; fail=1
  elif (cd apps/api && env -u PYTHONPATH uv run pytest -q -p no:warnings) >/tmp/hv-pytest.log 2>&1; then
    note "$(tail -1 /tmp/hv-pytest.log)"
  else
    note "FAILED:"; sed 's/^/    /' /tmp/hv-pytest.log | tail -25; fail=1
  fi
}

case "$scope" in
  docs) check_docs ;;
  code) check_code ;;
  all)  check_docs; echo; check_code ;;
  *) echo "usage: verify.sh [docs|code]" >&2; exit 2 ;;
esac

echo
if [[ $fail -eq 0 ]]; then echo "VERIFY: PASS"; else echo "VERIFY: FAIL"; fi
exit $fail
