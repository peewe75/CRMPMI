import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonUnauthorized(message = 'Unauthorized') {
  return jsonError(message, 401);
}

export function jsonForbidden(message = 'Forbidden') {
  return jsonError(message, 403);
}

export function jsonNotFound(message = 'Not found') {
  return jsonError(message, 404);
}

/**
 * Wraps a route handler with tenant context validation.
 * Catches known errors and returns appropriate HTTP responses.
 */
export function withErrorHandler(
  handler: (request: Request, context?: unknown) => Promise<NextResponse>
) {
  return async (request: Request, context?: unknown) => {
    try {
      return await handler(request, context);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';

      if (message.includes('Unauthorized')) return jsonUnauthorized(message);
      if (message.includes('Forbidden')) return jsonForbidden(message);
      if (message.includes('Not found')) return jsonNotFound(message);

      console.error('[API Error]', err);
      return jsonError('Internal server error', 500);
    }
  };
}
