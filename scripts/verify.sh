#!/usr/bin/env bash
# Single verify command for house-app.
#   bash scripts/verify.sh         # docs + code
#   bash scripts/verify.sh docs    # coursework deliverables only
#   bash scripts/verify.sh code    # typecheck + lint only
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
  local -A DOCS=(
    ["docs/sis/assignment-1-stakeholder-expectations.md"]="List of stakeholder's expectations"
    ["docs/sis/assignment-2-idea-and-feature-list.md"]="Idea list, initial feature list"
    ["docs/sis/assignment-3-weekly-plan-fact-report.md"]="Weekly Plan & Fact Report"
  )
  for f in $(printf '%s\n' "${!DOCS[@]}" | sort); do
    if   [[ ! -f "$f" ]]; then note "MISSING  $f  (${DOCS[$f]})"; fail=1
    elif [[ ! -s "$f" ]]; then note "EMPTY    $f"; fail=1
    else note "ok       $f"; fi
  done

  echo "== unresolved markers =="
  if grep -rnE '\b(TODO|TBD|FIXME|XXX)\b' docs/sis 2>/dev/null; then
    note "unresolved markers found above"; fail=1
  else note "none"; fi

  echo "== English-only check (submissions) =="
  if grep -rnP '[\x{0400}-\x{04FF}]' docs/sis 2>/dev/null; then
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
