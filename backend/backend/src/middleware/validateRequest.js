import ApiError from '../utils/ApiError.js';

export function validateBody(schema) {
  return function validateBodyMiddleware(req, res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ApiError(400, 'Request validation failed.', result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))));
    }
    req.body = result.data;
    next();
  };
}
