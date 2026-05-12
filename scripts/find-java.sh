#!/usr/bin/env bash
# Find Java 17+ and build the APK

# Look for Java 17 in common locations
JAVA17=""

# Check Gradle's provisioned JDKs (toolchain downloads)
if ls ~/.gradle/jdks/ 2>/dev/null | grep -q "17\|21"; then
    JAVA17=$(find ~/.gradle/jdks -name "java" -path "*/bin/java" 2>/dev/null | xargs -I{} dirname {} | xargs -I{} dirname {} 2>/dev/null | head -1)
fi

# Check SDKMAN
if [ -z "$JAVA17" ] && [ -d "$HOME/.sdkman/candidates/java" ]; then
    JAVA17=$(ls "$HOME/.sdkman/candidates/java/" 2>/dev/null | grep "17\|21" | head -1 | xargs -I{} echo "$HOME/.sdkman/candidates/java/{}")
fi

# Check /usr/local
if [ -z "$JAVA17" ]; then
    JAVA17=$(find /usr/local /opt -name "java" -path "*/bin/java" 2>/dev/null | xargs -I{} sh -c '"{}" -version 2>&1 | grep -q "17\|21" && dirname "{}" | xargs dirname' 2>/dev/null | head -1)
fi

echo "=== Java discovery ==="
echo "JAVA17 found: $JAVA17"
echo "Current java: $(java -version 2>&1 | head -1)"
echo "JAVA_HOME: $JAVA_HOME"
ls ~/.gradle/jdks/ 2>/dev/null || echo "No ~/.gradle/jdks"
ls /opt/java/ 2>/dev/null || echo "No /opt/java"
find /home/codespace -name "java" -path "*/bin/java" 2>/dev/null | head -5
