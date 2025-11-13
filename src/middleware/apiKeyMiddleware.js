/**
 * API Key Middleware
 * Validates API key for Python tracker client
 * VIHI IT Solutions HR System
 */

const asyncHandler = require('./asyncHandler');

// ============================================
// Validate API Key or JWT Token
// ============================================
exports.validateApiKey = asyncHandler(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  // Check for API key first
  if (apiKey) {
    if (apiKey === process.env.ACTIVITY_API_KEY) {
      // API key is valid, allow request
      return next();
    } else {
      res.status(401);
      throw new Error('Invalid API key');
    }
  }

  // Check for JWT token
  if (authHeader && authHeader.startsWith('Bearer')) {
    // Let the auth middleware handle JWT validation
    const { protect } = require('./authMiddleware');
    return protect(req, res, next);
  }

  // No valid authentication found
  res.status(401);
  throw new Error('No API key or JWT token provided');
});
