import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
    const parsed = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;
        const key = token.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith("--")) {
            parsed[key] = true;
        } else {
            parsed[key] = next;
            i += 1;
        }
    }
    return parsed;
}

function runNode(args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, args, { cwd, stdio: "inherit" });
        child.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with exit code ${code}: node ${args.join(" ")}`));
        });
    });
}

const args = parseArgs(process.argv.slice(2));
const cwd = process.cwd();
const authState = args.authState || process.env.MHUB_AUTH_STORAGE_STATE || "";
const adminState = args.adminState || process.env.MHUB_ADMIN_STORAGE_STATE || "";

const modes = [
    { mode: "guest", storageState: "" },
    { mode: "auth", storageState: authState },
    { mode: "admin", storageState: adminState },
];

const summary = [];
for (const current of modes) {
    if (current.mode !== "guest" && !current.storageState) {
        summary.push({
            mode: current.mode,
            status: "skipped",
            reason: "storage state not provided",
        });
        // eslint-disable-next-line no-console
        console.log(`[SKIP] ${current.mode}: no storage state provided`);
        continue;
    }

    const cmd = ["./scripts/capture-route-reference.mjs", "--mode", current.mode, "--outLabel", "multi-mode"];
    if (current.storageState) {
        cmd.push("--storageState", current.storageState);
    }

    await runNode(cmd, cwd);
    summary.push({
        mode: current.mode,
        status: "captured",
        storageState: current.storageState || null,
    });
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = path.resolve("..", "android-native", "test-screenshots", `web-reference-modes-summary-${stamp}.json`);
await fs.writeFile(out, JSON.stringify(summary, null, 2));
// eslint-disable-next-line no-console
console.log(`Multi-mode capture summary: ${out}`);
