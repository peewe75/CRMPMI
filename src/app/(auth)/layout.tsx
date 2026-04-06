import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sfondi estetici premium */}
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-500/20 dark:bg-blue-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/20 dark:bg-indigo-600/10 blur-[100px] pointer-events-none" />
      
      {/* Contenuto centrato */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-[400ms]">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Silhouette CRM</h1>
          <p className="text-slate-500 mt-2 text-sm">Il tuo magazzino, governato con eleganza.</p>
        </div>
        
        {children}
      </div>
    </div>
  );
}
