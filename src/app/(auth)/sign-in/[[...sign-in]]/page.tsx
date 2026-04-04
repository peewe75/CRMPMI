import { hasClerkFrontendConfig } from '@/lib/auth/clerk-config';

export default async function SignInPage() {
  if (!hasClerkFrontendConfig()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Accesso non disponibile</h1>
          <p className="mt-3 text-sm text-gray-600">
            Questo deployment non ha ancora la configurazione Clerk necessaria
            per mostrare il form di accesso.
          </p>
        </div>
      </div>
    );
  }

  const { SignIn } = await import('@clerk/nextjs');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <SignIn
        appearance={{
          elements: { rootBox: 'w-full max-w-md' },
        }}
      />
    </div>
  );
}
