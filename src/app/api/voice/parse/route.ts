import { requireFeatureEnabled } from '@/lib/auth/feature-flags';
import { parseVoiceTranscript } from '@/modules/voice/application/voice-parser';
import { jsonOk, jsonError, withErrorHandler } from '@/lib/utils/api';

export const POST = withErrorHandler(async (request: Request) => {
  await requireFeatureEnabled('voice_input', 'input vocale');
  const body = await request.json();
  const { text } = body as { text: string };

  if (!text?.trim()) {
    return jsonError('text is required');
  }

  const result = parseVoiceTranscript(text);
  return jsonOk(result);
});
