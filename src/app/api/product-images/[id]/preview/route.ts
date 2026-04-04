import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/utils/api';
import { getProductImageSignedUrl } from '@/modules/products/application/product-images-service';

export const GET = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const { signedUrl } = await getProductImageSignedUrl(id);
  return NextResponse.redirect(signedUrl, { status: 302 });
});
