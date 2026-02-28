const logger = require('../utils/logger');
const { captureException } = require('../services/errorReporter');

const errorHandler = (err, req, res, next) => {
    // Log the raw error for debugging
    console.error('🔥 [Global Error Handler]', err);
    if (logger && logger.error) logger.error(err);
    captureException(err, {
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.userId || req.user?.id || null
    });

    // Default error defaults
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // 1. Handle PostgreSQL Unique Constraint Violations (e.g. Duplicate Email)
    if (err.code === '23505') {
        statusCode = 409; // Conflict
        message = 'Duplicate entry found. This record already exists.';
        if (err.detail && err.detail.includes('email')) message = 'This email is already registered.';
        if (err.detail && err.detail.includes('phone')) message = 'This phone number is already registered.';
    }

    // 2. Handle UUID Syntax Errors
    if (err.code === '22P02' && err.message.includes('uuid')) {
        statusCode = 400;
        message = 'Invalid ID format.';
    }

    // 3. Handle Foreign Key Violations (e.g. User not found for post)
    if (err.code === '23503') {
        statusCode = 400;
        message = 'Referenced record not found (Invalid ID).';
    }

    // 4. Handle JWT Errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token. Please log in again.';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Session expired. Please log in again.';
    }

    // Security: Don't leak stack traces in production
    const response = {
        error: message,
        success: false
    };

    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
        response.rawError = err;
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
