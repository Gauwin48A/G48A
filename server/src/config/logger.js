const pino = require('pino');

// High-performance structured logger
// In production: JSON output for Logstash/Splunk
// In development: Pretty colors for readability
const isProduction = process.env.NODE_ENV === 'production';
const baseOptions = {
    level: process.env.LOG_LEVEL || 'info',
};

const logger = isProduction
    ? pino(baseOptions)
    : pino({
        ...baseOptions,
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname', // Clean output
        }
    }
    });

module.exports = logger;
