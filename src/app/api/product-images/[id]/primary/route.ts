import { jsonOk, withErrorHandler } from '@/lib/utils/api';
import { setPrimaryProductImage } from '@/modules/products/application/product-images-service';

export const POST = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const image = await setPrimaryProductImage(id);
  return jsonOk({ image });
});
