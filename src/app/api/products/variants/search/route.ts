import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';
import { searchVariantsForMatching } from '@/modules/products/application/products-service';

export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? undefined;
  const size = searchParams.get('size') ?? undefined;
  const color = searchParams.get('color') ?? undefined;
  const material = searchParams.get('material') ?? undefined;
  const productId = searchParams.get('product_id') ?? undefined;
  const limit = Number(searchParams.get('limit') ?? '12');

  if (!q && !size && !color && !material && !productId) {
    return jsonError('At least one search parameter is required');
  }

  const variants = await searchVariantsForMatching({
    q,
    size,
    color,
    material,
    product_id: productId,
    limit: Number.isFinite(limit) ? limit : 12,
  });

  return jsonOk({ variants });
});
