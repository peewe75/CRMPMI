import { hasClerkFrontendConfig } from '@/lib/auth/clerk-config';

export default async function SignInPage() {
  if (!hasClerkFrontendConfig()) {
    return (
      <div className="w-full rounded-3xl border border-amber-200/50 bg-white/80 p-8 text-center shadow-xl backdrop-blur-sm dark:bg-slate-900/80 dark:border-amber-900/50">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Accesso non configurato</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Questo progetto non ha la configurazione di Clerk per mostrare il login.
        </p>
      </div>
    );
  }

  const { SignIn } = await import('@clerk/nextjs');

  return (
    <div className="flex w-full justify-center">
      <SignIn
        appearance={{
          elements: { 
            card: 'rounded-3xl shadow-2xl border-slate-200/50 dark:border-slate-800/50',
            rootBox: 'w-full',
          },
        }}
        routing="path" 
        path="/sign-in"
      />
    </div>
  );
}
