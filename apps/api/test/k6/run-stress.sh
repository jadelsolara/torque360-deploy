#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TORQUE 360 — k6 Stress Test Runner
#
# Usage:
#   ./test/k6/run-stress.sh                    # run all tests (load profile)
#   ./test/k6/run-stress.sh smoke              # smoke test (5 VUs)
#   ./test/k6/run-stress.sh load               # load test (default)
#   ./test/k6/run-stress.sh stress             # stress test (high VUs)
#   ./test/k6/run-stress.sh spike              # spike test (sudden burst)
#   ./test/k6/run-stress.sh soak               # soak test (30 min)
#   ./test/k6/run-stress.sh auth               # single suite
#   ./test/k6/run-stress.sh work-orders smoke  # single suite + profile
#
# Environment:
#   BASE_URL   — API base (default: http://localhost:3000/api)
#   VUS        — max virtual users (default: 50 for load, varies by profile)
#   DURATION   — override duration
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
mkdir -p "$RESULTS_DIR"

# Defaults
BASE_URL="${BASE_URL:-http://localhost:3000/api}"
PROFILE="${1:-load}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }

# ── Check k6 is installed ────────────────────────────────────────────────────
if ! command -v k6 &>/dev/null; then
  fail "k6 not found. Install: https://k6.io/docs/get-started/installation/"
  echo "  brew install k6        # macOS"
  echo "  snap install k6        # Linux"
  echo "  choco install k6       # Windows"
  exit 1
fi

# ── Check API is reachable ───────────────────────────────────────────────────
info "Checking API at ${BASE_URL}..."
if curl -sf "${BASE_URL}/health" >/dev/null 2>&1; then
  ok "API is reachable"
else
  warn "API health check failed (${BASE_URL}/health). Tests may fail."
fi

# ── Test suites ──────────────────────────────────────────────────────────────
ALL_SUITES=(
  "auth-stress"
  "work-orders-stress"
  "inventory-stress"
  "dashboard-stress"
  "payroll-stress"
  "suppliers-stress"
  "full-lifecycle-stress"
)

# ── VU defaults per profile ──────────────────────────────────────────────────
get_vus() {
  case "$1" in
    smoke)   echo "${VUS:-5}"   ;;
    load)    echo "${VUS:-50}"  ;;
    stress)  echo "${VUS:-100}" ;;
    spike)   echo "${VUS:-100}" ;;
    soak)    echo "${VUS:-30}"  ;;
    *)       echo "${VUS:-50}"  ;;
  esac
}

# ── Determine what to run ────────────────────────────────────────────────────
SUITES_TO_RUN=()

# Check if first arg is a suite name
is_suite() {
  for s in "${ALL_SUITES[@]}"; do
    [[ "$s" == "$1-stress" || "$s" == "$1" ]] && return 0
  done
  return 1
}

if is_suite "${1:-}"; then
  # Single suite mode
  SUITE_NAME="${1}-stress"
  # Check if it already ends in -stress
  for s in "${ALL_SUITES[@]}"; do
    [[ "$s" == "$1" ]] && SUITE_NAME="$1"
  done
  SUITES_TO_RUN=("$SUITE_NAME")
  PROFILE="${2:-load}"
elif [[ "$PROFILE" =~ ^(smoke|load|stress|spike|soak)$ ]]; then
  SUITES_TO_RUN=("${ALL_SUITES[@]}")
else
  fail "Unknown argument: $PROFILE"
  echo "Usage: $0 [suite|profile] [profile]"
  echo "Suites: ${ALL_SUITES[*]}"
  echo "Profiles: smoke, load, stress, spike, soak"
  exit 1
fi

VUS=$(get_vus "$PROFILE")

# ── Print run info ───────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            TORQUE 360 — Stress Test Suite                   ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Profile:  ${PROFILE}"
echo "║  VUs:      ${VUS}"
echo "║  API:      ${BASE_URL}"
echo "║  Suites:   ${#SUITES_TO_RUN[@]}"
echo "║  Output:   ${RESULTS_DIR}"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Run each suite ───────────────────────────────────────────────────────────
PASSED=0
FAILED=0
RESULTS=()

for suite in "${SUITES_TO_RUN[@]}"; do
  SUITE_FILE="${SCRIPT_DIR}/${suite}.js"

  if [[ ! -f "$SUITE_FILE" ]]; then
    warn "Suite file not found: ${SUITE_FILE} — skipping"
    continue
  fi

  RESULT_FILE="${RESULTS_DIR}/${suite}-${PROFILE}-${TIMESTAMP}.json"

  info "Running: ${suite} (profile: ${PROFILE}, VUs: ${VUS})"
  echo "────────────────────────────────────────────────────────────"

  if k6 run \
    --out "json=${RESULT_FILE}" \
    -e "BASE_URL=${BASE_URL}" \
    -e "VUS=${VUS}" \
    "$SUITE_FILE" 2>&1; then
    ok "${suite} — PASSED"
    PASSED=$((PASSED + 1))
    RESULTS+=("✅ ${suite}")
  else
    fail "${suite} — FAILED (thresholds breached or errors)"
    FAILED=$((FAILED + 1))
    RESULTS+=("❌ ${suite}")
  fi

  echo ""
  sleep 2 # Brief pause between suites
done

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    TEST RESULTS SUMMARY                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
for r in "${RESULTS[@]}"; do
  echo "║  ${r}"
done
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Passed: ${PASSED}  |  Failed: ${FAILED}  |  Total: ${#SUITES_TO_RUN[@]}"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Results saved to: ${RESULTS_DIR}/"

# Exit with error if any suite failed
[[ $FAILED -gt 0 ]] && exit 1
exit 0
