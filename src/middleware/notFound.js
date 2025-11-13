/**
 * 404 Not Found Middleware
 * VIHI IT Solutions HR System
 */

exports.notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
