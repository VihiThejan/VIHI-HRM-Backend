/**
 * JWT Utility Functions
 * VIHI IT Solutions HR System
 */

const jwt = require('jsonwebtoken');

/**
 * Generate JWT Token
 * @param {String} id - User ID
 * @returns {String} - JWT token
 */
exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

/**
 * Verify JWT Token
 * @param {String} token - JWT token
 * @returns {Object} - Decoded payload
 */
exports.verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
