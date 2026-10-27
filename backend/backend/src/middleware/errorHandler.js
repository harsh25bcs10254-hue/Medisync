import ApiError from '../utils/ApiError.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error.';
  let details = error.details;

  if (error?.code === 11000) {
    statusCode = 409;
    message = 'A record with this value already exists.';
    details = undefined;
  } else if (error?.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database validation failed.';
    details = Object.values(error.errors || {}).map((item) => item.message);
  } else if (error?.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier.';
    details = undefined;
  }

  if (!(error instanceof ApiError) && statusCode >= 500) {
    console.error(error);
    message = 'Internal server error.';
    details = undefined;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 ? { requestId: req.id } : {})
  });
}
