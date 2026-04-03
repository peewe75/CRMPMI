import { searchProducts } from '@/modules/products/application/products-service';
import { jsonOk, jsonError, withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q?.trim()) {
    return jsonError('q parameter is required');
  }

  const results = await searchProducts(q.trim());
  return jsonOk(results);
});
