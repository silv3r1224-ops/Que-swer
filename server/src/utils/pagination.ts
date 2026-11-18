import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().default('createdAt:desc'),
});

export type SortDir = 'asc' | 'desc';
export type PrismaOrder = Record<string, SortDir>;

export interface Pagination {
  page: number;
  pageSize: number;
  orderBy: PrismaOrder;
  skip: number;
  take: number;
}

/**
 * Parses ?page=&pageSize=&sort=field:dir from a request.
 * If `allowedSorts` is provided, an unsorted field falls back to createdAt:desc
 * (prevents abuse of arbitrary column sorting).
 */
export function parsePagination(input: unknown, allowedSorts?: string[]): Pagination {
  const { page, pageSize, sort } = paginationSchema.parse(input);
  const [field, dir] = sort.split(':') as [string, string | undefined];

  let orderBy: PrismaOrder = { [field]: dir === 'asc' ? 'asc' : 'desc' };
  if (allowedSorts && !allowedSorts.includes(field)) {
    orderBy = { createdAt: 'desc' };
  }
  return { page, pageSize, orderBy, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPageMeta(total: number, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasNext: page * pageSize < total,
    hasPrev: page > 1,
  };
}
