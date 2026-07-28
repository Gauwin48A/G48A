#!/bin/bash
# Run all test files individually and produce a clean summary
DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_FILE="/tmp/jest_full_results.txt"
SUMMARY_FILE="/tmp/jest_summary.txt"
PASSED=0
FAILED=0
TIMEOUT=30

echo "Running all test files individually..." > "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

for test_file in "$DIR"/tests/*.test.js; do
  name=$(basename "$test_file")
  echo -n "  $name ... "
  result=$(timeout $TIMEOUT node "$DIR/scripts/run-jest.js" --runInBand --silent "$test_file" 2>/dev/null)
  exit_code=$?
  
  # Extract test counts
  tests_line=$(echo "$result" | grep -oP 'Tests:\s+\d+ passed,\s+\d+ total')
  
  if [ $exit_code -eq 0 ]; then
    echo "PASS ($tests_line)" >> "$RESULTS_FILE"
    echo "PASS ($tests_line)"
    PASSED=$((PASSED + 1))
  elif [ $exit_code -eq 124 ]; then
    echo "TIMEOUT" >> "$RESULTS_FILE"
    echo "TIMEOUT"
    FAILED=$((FAILED + 1))
  else
    # Get failure details
    fail_details=$(echo "$result" | grep -oP 'FAIL.*')
    fail_tests=$(echo "$result" | grep -oP 'Tests:\s+\d+ passed,\s+\d+ total')
    echo "FAIL ($fail_tests) - $fail_details" >> "$RESULTS_FILE"
    echo "FAIL ($fail_tests)"
    FAILED=$((FAILED + 1))
  fi
done

echo "" >> "$RESULTS_FILE"
echo "==========================================" >> "$RESULTS_FILE"
echo "  TOTAL: $PASSED passed, $FAILED failed" >> "$RESULTS_FILE"
echo "==========================================" >> "$RESULTS_FILE"

echo ""
echo "=========================================="
echo "  TOTAL: $PASSED passed, $FAILED failed"
echo "=========================================="

# Write summary
echo "PASSED=$PASSED" > "$SUMMARY_FILE"
echo "FAILED=$FAILED" >> "$SUMMARY_FILE"
grep -E "^(PASS|FAIL|TIMEOUT)" "$RESULTS_FILE" > /tmp/jest_short_summary.txt
