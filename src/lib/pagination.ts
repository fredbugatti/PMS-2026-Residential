// Pagination utilities for API list endpoints

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Default pagination values
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

// Parse pagination params from URL search params
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10));
  const requestedLimit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// Create paginated response
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasMore: params.page < totalPages
    }
  };
}

// Prisma pagination args helper
export function getPrismaPageArgs(params: PaginationParams) {
  return {
    skip: params.offset,
    take: params.limit
  };
}
