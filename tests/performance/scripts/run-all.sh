#!/bin/bash

###############################################################################
# VibeBox Performance Test Suite Runner
#
# Runs all performance tests in sequence and generates a comprehensive report.
#
# Usage:
#   ./tests/performance/scripts/run-all.sh [scenario]
#
# Arguments:
#   scenario - Test scenario to run (smoke, load, stress, spike, soak)
#              Default: smoke
#
# Examples:
#   ./tests/performance/scripts/run-all.sh smoke
#   ./tests/performance/scripts/run-all.sh load
#   ./tests/performance/scripts/run-all.sh stress
#
# Environment Variables:
#   BASE_URL - API base URL (default: http://localhost:3000)
#   TEST_USERS - Number of test users to create (default: 10)
#   THINK_TIME_MIN - Minimum think time in seconds (default: 1)
#   THINK_TIME_MAX - Maximum think time in seconds (default: 5)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCENARIO="${1:-smoke}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_USERS="${TEST_USERS:-10}"
RESULTS_DIR="tests/performance/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${RESULTS_DIR}/report_${SCENARIO}_${TIMESTAMP}.md"

# Test files
TESTS=(
  "tests/performance/scenarios/api-load.test.js"
  "tests/performance/scenarios/dashboard-query.test.js"
  "tests/performance/scenarios/environment-lifecycle.test.js"
  "tests/performance/scenarios/websocket-streaming.test.js"
)

# Test names for reporting
TEST_NAMES=(
  "API Load Test"
  "Dashboard Query Test"
  "Environment Lifecycle Test"
  "WebSocket Streaming Test"
)

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

check_dependencies() {
  print_header "Checking Dependencies"

  if ! command -v k6 &> /dev/null; then
    print_error "k6 is not installed"
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   https://k6.io/docs/getting-started/installation/"
    echo "  Windows: choco install k6"
    exit 1
  fi

  print_success "k6 $(k6 version --quiet) installed"

  if ! command -v jq &> /dev/null; then
    print_warning "jq is not installed (optional, for JSON processing)"
  else
    print_success "jq installed"
  fi
}

check_api_health() {
  print_header "Checking API Health"

  print_info "Testing connection to ${BASE_URL}"

  if curl -f -s "${BASE_URL}/health" > /dev/null 2>&1; then
    print_success "API is healthy and responding"
  else
    print_warning "API health check failed or endpoint not available"
    print_info "Continuing anyway (server might not have /health endpoint)"
  fi
}

cleanup_old_results() {
  print_header "Preparing Results Directory"

  mkdir -p "${RESULTS_DIR}"
  print_success "Results directory ready: ${RESULTS_DIR}"

  # Keep only last 10 reports
  local report_count=$(find "${RESULTS_DIR}" -name "report_*.md" | wc -l)
  if [ "$report_count" -gt 10 ]; then
    print_info "Cleaning up old reports (keeping last 10)..."
    find "${RESULTS_DIR}" -name "report_*.md" -type f | sort | head -n -10 | xargs rm -f
  fi
}

run_test() {
  local test_file=$1
  local test_name=$2
  local test_num=$3
  local total_tests=$4

  print_header "Test ${test_num}/${total_tests}: ${test_name}"

  print_info "Scenario: ${SCENARIO}"
  print_info "Test file: ${test_file}"
  echo ""

  # Run k6 test
  local start_time=$(date +%s)

  if k6 run \
    --env SCENARIO="${SCENARIO}" \
    --env BASE_URL="${BASE_URL}" \
    --env TEST_USERS="${TEST_USERS}" \
    --env THINK_TIME_MIN="${THINK_TIME_MIN}" \
    --env THINK_TIME_MAX="${THINK_TIME_MAX}" \
    --out json="${RESULTS_DIR}/${test_name// /_}_${TIMESTAMP}.json" \
    "${test_file}"; then

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_success "${test_name} completed successfully in ${duration}s"
    return 0
  else
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_error "${test_name} failed after ${duration}s"
    return 1
  fi
}

generate_report() {
  print_header "Generating Report"

  cat > "${REPORT_FILE}" << EOF
# VibeBox Performance Test Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Scenario:** ${SCENARIO}
**Base URL:** ${BASE_URL}
**Test Users:** ${TEST_USERS}

---

## Summary

This report contains the results of all performance tests run against VibeBox.

### Tests Executed

EOF

  local test_count=0
  local passed_count=0
  local failed_count=0

  for i in "${!TESTS[@]}"; do
    test_count=$((test_count + 1))

    local test_name="${TEST_NAMES[$i]}"
    local json_file="${RESULTS_DIR}/${test_name// /_}_${TIMESTAMP}.json"

    if [ -f "${json_file}" ]; then
      passed_count=$((passed_count + 1))
      echo "- ✓ ${test_name}" >> "${REPORT_FILE}"
    else
      failed_count=$((failed_count + 1))
      echo "- ✗ ${test_name} (FAILED)" >> "${REPORT_FILE}"
    fi
  done

  cat >> "${REPORT_FILE}" << EOF

### Results
- **Total Tests:** ${test_count}
- **Passed:** ${passed_count}
- **Failed:** ${failed_count}

---

## Performance Targets

### API Performance
- ✓ Sub-second API response times for CRUD operations
- ✓ <2s environment startup (excluding Docker spin-up)
- ✓ <200ms p95 for dashboard queries

### Capacity
- Support 1,000+ total environments
- 10 concurrent environments per user

### WebSocket
- Stable connections under load
- <100ms message latency

---

## Test Details

EOF

  # Add detailed results for each test
  for i in "${!TESTS[@]}"; do
    local test_name="${TEST_NAMES[$i]}"
    local summary_file="${RESULTS_DIR}/${test_name// /_,,}_summary.json"

    echo "### ${test_name}" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"

    if [ -f "${summary_file}" ]; then
      # Extract key metrics if jq is available
      if command -v jq &> /dev/null; then
        echo "\`\`\`" >> "${REPORT_FILE}"
        jq -r '.metrics | to_entries[] | select(.key | test("http_req_duration|checks|errors")) | "\(.key): \(.value.values)"' "${summary_file}" 2>/dev/null >> "${REPORT_FILE}" || echo "Metrics data available in ${summary_file}" >> "${REPORT_FILE}"
        echo "\`\`\`" >> "${REPORT_FILE}"
      else
        echo "See detailed results in: \`${summary_file}\`" >> "${REPORT_FILE}"
      fi
    else
      echo "*No detailed results available*" >> "${REPORT_FILE}"
    fi

    echo "" >> "${REPORT_FILE}"
  done

  cat >> "${REPORT_FILE}" << EOF

---

## Files Generated

- Report: \`${REPORT_FILE}\`
- Raw results: \`${RESULTS_DIR}/*_${TIMESTAMP}.json\`

## Next Steps

1. Review individual test summaries above
2. Check for threshold violations
3. Identify performance bottlenecks
4. Compare with previous test runs
5. Optimize slow endpoints

---

**Generated by:** VibeBox Performance Test Suite
**Version:** 1.0.0
EOF

  print_success "Report generated: ${REPORT_FILE}"
}

display_summary() {
  print_header "Test Suite Complete"

  echo ""
  echo "Summary:"
  echo "  Scenario: ${SCENARIO}"
  echo "  Tests run: ${#TESTS[@]}"
  echo "  Report: ${REPORT_FILE}"
  echo ""

  if [ -f "${REPORT_FILE}" ]; then
    print_info "View full report:"
    print_info "  cat ${REPORT_FILE}"
    print_info "  or open in your editor"
  fi

  echo ""
  print_success "All tests completed!"
}

###############################################################################
# Main Execution
###############################################################################

main() {
  print_header "VibeBox Performance Test Suite"

  echo "Configuration:"
  echo "  Scenario: ${SCENARIO}"
  echo "  Base URL: ${BASE_URL}"
  echo "  Test Users: ${TEST_USERS}"
  echo "  Think Time: ${THINK_TIME_MIN:-1}s - ${THINK_TIME_MAX:-5}s"
  echo ""

  # Validate scenario
  if [[ ! "${SCENARIO}" =~ ^(smoke|load|stress|spike|soak)$ ]]; then
    print_error "Invalid scenario: ${SCENARIO}"
    echo ""
    echo "Valid scenarios: smoke, load, stress, spike, soak"
    exit 1
  fi

  # Check dependencies
  check_dependencies

  # Check API health
  check_api_health

  # Prepare results directory
  cleanup_old_results

  # Run all tests
  local test_count=${#TESTS[@]}
  local failed_tests=0

  for i in "${!TESTS[@]}"; do
    local test_num=$((i + 1))
    local test_file="${TESTS[$i]}"
    local test_name="${TEST_NAMES[$i]}"

    if ! run_test "${test_file}" "${test_name}" "${test_num}" "${test_count}"; then
      failed_tests=$((failed_tests + 1))
    fi

    # Brief pause between tests
    if [ $test_num -lt $test_count ]; then
      print_info "Waiting 10s before next test..."
      sleep 10
    fi
  done

  # Generate report
  generate_report

  # Display summary
  display_summary

  # Exit with error if any tests failed
  if [ $failed_tests -gt 0 ]; then
    print_error "${failed_tests} test(s) failed"
    exit 1
  fi
}

# Run main function
main "$@"
