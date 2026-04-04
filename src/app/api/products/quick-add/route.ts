import { quickAddCatalogEntry } from '@/modules/products/application/quick-add-service';
import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json();
  const {
    product_id,
    brand,
    model_name,
    category,
    supplier_name,
    size,
    color,
    material,
    barcode,
    sku_supplier,
    sku_internal,
    cost_price,
    sale_price,
    quantity,
    notes,
    store_id,
  } = body as {
    product_id?: string;
    brand?: string;
    model_name?: string;
    category?: string;
    supplier_name?: string;
    size?: string;
    color?: string;
    material?: string;
    barcode?: string;
    sku_supplier?: string;
    sku_internal?: string;
    cost_price?: number | string | null;
    sale_price?: number | string | null;
    quantity?: number | string | null;
    notes?: string;
    store_id?: string;
  };

  if (!product_id && (!brand?.trim() || !model_name?.trim())) {
    return jsonError('brand and model_name are required');
  }

  const parsedQuantity = quantity == null || quantity === '' ? 0 : Number(quantity);
  const parsedCost = cost_price == null || cost_price === '' ? undefined : Number(cost_price);
  const parsedSale = sale_price == null || sale_price === '' ? undefined : Number(sale_price);

  if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
    return jsonError('quantity must be a non-negative number');
  }

  if ((parsedCost != null && Number.isNaN(parsedCost)) || (parsedSale != null && Number.isNaN(parsedSale))) {
    return jsonError('cost_price and sale_price must be valid numbers');
  }

  const result = await quickAddCatalogEntry({
    product_id,
    brand,
    model_name,
    category,
    supplier_name,
    size,
    color,
    material,
    barcode,
    sku_supplier,
    sku_internal,
    cost_price: parsedCost,
    sale_price: parsedSale,
    quantity: parsedQuantity,
    notes,
    store_id,
  });

  return jsonOk(result, 201);
});
