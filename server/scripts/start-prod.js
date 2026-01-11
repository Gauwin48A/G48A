/**
 * PRODUCTION STARTUP SCRIPT
 * 
 * Reliability Feature: Auto-Healing
 * 1. Checks if Port 5000 is locked by a zombie process.
 * 2. Kills the zombie process safely.
 * 3. Starts the server with robust error handling.
 */

const { spawn, exec } = require('child_process');
const net = require('net');
const os = require('os');

const PORT = process.env.PORT || 5000;

// Function to check if port is in use
const checkPort = (port) => {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true); // Port is in use
            } else {
                reject(err);
            }
        });

        server.once('listening', () => {
            server.close();
            resolve(false); // Port is free
        });

        server.listen(port);
    });
};

// Function to kill process on port (Cross-platform)
const killProcessOnPort = async (port) => {
    console.log(`⚠️  Port ${port} is busy. Clearing it...`);

    const isWin = os.platform() === 'win32';
    const command = isWin
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port} -t`;

    return new Promise((resolve) => {
        exec(command, (err, stdout) => {
            if (err || !stdout) {
                // No process found matching (rare race condition), just proceed
                resolve();
                return;
            }

            const pids = stdout.split('\n')
                .map(line => {
                    if (isWin) {
                        const parts = line.trim().split(/\s+/);
                        return parts[parts.length - 1]; // PID is last column
                    } else {
                        return line.trim();
                    }
                })
                .filter(pid => pid && !isNaN(pid));

            if (pids.length === 0) {
                resolve();
                return;
            }

            const uniquePids = [...new Set(pids)];
            console.log(`🔪 Killing zombie processes: ${uniquePids.join(', ')}`);

            const killCmd = isWin
                ? `taskkill /F /PID ${uniquePids.join(' /PID ')}`
                : `kill -9 ${uniquePids.join(' ')}`;

            exec(killCmd, () => {
                // Wait a second for OS to release the port
                setTimeout(resolve, 1000);
            });
        });
    });
};

const startServer = async () => {
    console.log('🚀 Initializing One-Click Production Start...');

    try {
        const isBusy = await checkPort(PORT);
        if (isBusy) {
            await killProcessOnPort(PORT);
        }

        console.log('✅ Port is clear. Starting Server...');

        // Start the actual server
        const server = spawn('node', ['src/index.js'], {
            stdio: 'inherit',
            env: process.env,
            cwd: process.cwd()
        });

        server.on('close', (code) => {
            if (code !== 0) {
                console.error(`❌ Server crash detected (Exit Code: ${code}). Auto-restarting...`);
                // Basic auto-restart logic for this script
                setTimeout(startServer, 2000);
            }
        });

    } catch (err) {
        console.error('🔥 Startup Fatal Error:', err);
        process.exit(1);
    }
};

startServer();
