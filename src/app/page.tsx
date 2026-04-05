import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  hasClerkServerConfig,
} from '@/lib/auth/clerk-config';
import LandingContent from '@/components/landing/landing-content';

export const metadata: Metadata = {
  title: 'Silhouette CRM - Il Futuro del Retail',
  description: 'Scopri Silhouette, il CRM intelligente con assistente vocale che rivoluziona la gestione del tuo negozio. Efficienza, precisione e potenza ai tuoi comandi.',
};

export default async function LandingPage() {
  let tenantContext: { userId: string } | null = null;

  if (hasClerkServerConfig()) {
    const { getTenantContext } = await import('@/lib/auth/tenant');
    tenantContext = await getTenantContext();
  }

  if (tenantContext?.userId) {
    redirect('/dashboard');
  }

  return <LandingContent />;
}
