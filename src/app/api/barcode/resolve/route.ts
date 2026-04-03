import { resolveBarcode } from '@/modules/products/application/products-service';
import { jsonOk, jsonError, withErrorHandler } from '@/lib/utils/api';

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { barcode } = body as { barcode: string };

  if (!barcode?.trim()) {
    return jsonError('barcode is required');
  }

  const result = await resolveBarcode(barcode.trim());

  if (!result) {
    return jsonOk({ found: false });
  }

  const product = result.products as unknown as { id: string; brand: string; model_name: string };
  return jsonOk({
    found: true,
    product: { id: product.id, brand: product.brand, model_name: product.model_name },
    variant: { id: result.id, size: result.size, color: result.color },
  });
});
