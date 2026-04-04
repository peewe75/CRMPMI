import { jsonOk, withErrorHandler } from '@/lib/utils/api';
import { deleteProductImage } from '@/modules/products/application/product-images-service';

export const DELETE = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const image = await deleteProductImage(id);
  return jsonOk({ image });
});
