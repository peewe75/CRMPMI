import { createServiceClient } from './server';
import type { AuditAction } from '@/types/database';

export async function writeAuditLog(params: {
  orgId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  payload?: Record<string, unknown>;
}) {
  const db = createServiceClient();

  await db.from('audit_logs').insert({
    org_id: params.orgId,
    actor_user_id: params.actorUserId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    payload: params.payload ?? {},
  });
}
