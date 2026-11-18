import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '../lib/AppError.js';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates req.body / req.query / req.params against Zod schemas.
 * On failure it responds 400 with the flattened field errors.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        const p = schemas.params.parse(req.params);
        // Express 5 exposes req.params as an own getter — replace it.
        Object.defineProperty(req, 'params', { value: p, writable: true, configurable: true });
      }
      if (schemas.query) {
        const q = schemas.query.parse(req.query);
        // Express 5 exposes req.query as a getter-only property — replace it.
        Object.defineProperty(req, 'query', { value: q, writable: true, configurable: true });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      const issues = (err as { issues?: unknown }).issues;
      next(
        badRequest(
          'Validation failed',
          issues ?? (err instanceof Error ? err.message : String(err)),
        ),
      );
    }
  };
}
