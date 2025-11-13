/**
 * Async Handler - Wraps async functions to catch errors
 * VIHI IT Solutions HR System
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
