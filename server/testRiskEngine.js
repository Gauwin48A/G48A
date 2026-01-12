const { evaluateLoginRisk } = require('./server/src/services/riskEngine');

async function runTests() {
    console.log("--- Starting Risk Engine Verification ---");

    // Mock User ID: 1
    const userId = 1;

    // SCENARIO 1: First Login (Should ALLOW)
    // Note: We'll have to mock the DB or just assume it works for non-existent users
    // For unit testing the logic, we might want to isolate the distance/risk part

    console.log("\nScenario 1: IP Fallback (No GPS)");
    const res1 = await evaluateLoginRisk(userId, null, null, 'dev1', '8.8.8.8');
    console.log("Result:", res1);

    console.log("\nScenario 2: GPS-IP Mismatch (USA GPS, India IP)");
    // Mumbai IP: 103.21.159.0 (Deriving from geoip-lite lookup)
    const res2 = await evaluateLoginRisk(userId, 40.7128, -74.0060, 'dev1', '103.21.159.0');
    console.log("Result:", res2);

    console.log("\nScenario 3: Same Device, Short distance (Safe)");
    // This requires a real last login in history, so we might need to insert one
}

// runTests();
console.log("Verify logic manually for now as DB mock is complex.");
