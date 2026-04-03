import { createMovement } from '@/modules/inventory/application/inventory-service';
import { getOrCreateDefaultStore } from '@/modules/inventory/application/inventory-service';
import { jsonOk, jsonError, withErrorHandler } from '@/lib/utils/api';

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json();

  const { variant_id, movement_type, quantity, store_id, notes, source_document_type, source_document_id } = body as {
    variant_id: string;
    movement_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
    quantity: number;
    store_id?: string;
    notes?: string;
    source_document_type?: string;
    source_document_id?: string;
  };

  if (!variant_id || !movement_type || quantity == null) {
    return jsonError('variant_id, movement_type, and quantity are required');
  }

  // Use default store if not specified
  let finalStoreId = store_id;
  if (!finalStoreId) {
    const defaultStore = await getOrCreateDefaultStore();
    finalStoreId = defaultStore.id;
  }

  const movement = await createMovement({
    store_id: finalStoreId,
    variant_id,
    movement_type,
    quantity,
    notes,
    source_document_type,
    source_document_id,
  });

  return jsonOk(movement, 201);
});
