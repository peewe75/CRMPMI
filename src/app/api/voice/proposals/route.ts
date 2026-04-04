import { requireFeatureEnabled } from '@/lib/auth/feature-flags';
import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';
import { createVoiceProposalFromInterpretation, interpretVoiceCommand } from '@/modules/voice/application/voice-service';

export const POST = withErrorHandler(async (request: Request) => {
  await requireFeatureEnabled('voice_input', 'input vocale');
  const body = await request.json();
  const { text, target_store_id } = body as { text?: string; target_store_id?: string | null };

  if (!text?.trim()) {
    return jsonError('text is required');
  }

  const parsed = await interpretVoiceCommand(text);
  const result = await createVoiceProposalFromInterpretation({
    raw_text: text,
    parsed,
    target_store_id: target_store_id ?? null,
  });

  return jsonOk(result, 201);
});
