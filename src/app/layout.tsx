import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { hasClerkFrontendConfig } from '@/lib/auth/clerk-config';
import { Providers } from '@/components/providers';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'CRM Negozi',
  description: 'Gestionale mobile per negozi di scarpe e abbigliamento',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CRM Negozi',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appShell = (
    <html lang="it" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );

  if (!hasClerkFrontendConfig()) {
    return appShell;
  }

  const { ClerkProvider } = await import('@clerk/nextjs');

  return (
    <ClerkProvider afterSignOutUrl="/">
      {appShell}
    </ClerkProvider>
  );
}
