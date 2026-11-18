import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async Express handler, forwarding rejections to the central
 * error middleware (Express 5 also handles async rejections natively, but
 * the explicit wrapper keeps behaviour identical and testable).
 */
export const asyncHandler =
  <P = Record<string, string>>(
    fn: (req: Request<P>, res: Response, next: NextFunction) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
