const logger = require("../utils/logger");
const { captureException } = require("../services/errorReporter");

/**
 * Global Express error-handling middleware.
 * Logs the error, reports it to the error-tracking service, and returns
 * a structured JSON response. Translates common Postgres and JWT error
 * codes into user-friendly messages and appropriate HTTP status codes.
 * In non-production environments, the stack trace and raw error are included.
 * @param {Error} err - The error object.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
  console.error("🔥 [Global Error Handler]", err);

  if (logger && logger.error) logger.error(err);

  captureException(err, {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.userId || req.user?.id || null
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Postgres: unique violation
  if (err.code === "23505") {
    statusCode = 409;
    message = "Duplicate entry found. This record already exists.";
    if (err.detail && err.detail.includes("email"))
      message = "This email is already registered.";
    if (err.detail && err.detail.includes("phone"))
      message = "This phone number is already registered.";
  }

  // Postgres: invalid text representation (bad UUID)
  if (err.code === "22P02" && err.message.includes("uuid")) {
    statusCode = 400;
    message = "Invalid ID format.";
  }

  // Postgres: invalid input syntax (e.g. string passed as integer)
  if (err.code === "22P02" && !err.message.includes("uuid")) {
    statusCode = 400;
    message = "Invalid request parameter.";
  }

  // Postgres: foreign key violation
  if (err.code === "23503") {
    statusCode = 400;
    message = "Referenced record not found (Invalid ID).";
  }

  // JWT: malformed token
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  // JWT: expired token
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired. Please log in again.";
  }

  const response = {
    error: message,
    success: false
  };

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
    response.rawError = err;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
