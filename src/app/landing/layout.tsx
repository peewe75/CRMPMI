import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Silhouette CRM - Il Futuro del Retail',
  description: 'Scopri Silhouette, il CRM intelligente con assistente vocale che rivoluziona la gestione del tuo negozio. Efficienza, precisione e potenza ai tuoi comandi.',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
