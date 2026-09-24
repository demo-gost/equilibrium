export const successResponse = <T>(data: T, message = 'Success', statusCode = 200) => ({
  success: true,
  statusCode,
  message,
  data,
  timestamp: new Date().toISOString(),
});

export const errorResponse = (message: string, statusCode = 500, details?: unknown) => ({
  success: false,
  statusCode,
  message,
  details: details || null,
  timestamp: new Date().toISOString(),
});

export const paginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success'
) => ({
  success: true,
  message,
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
  timestamp: new Date().toISOString(),
});
