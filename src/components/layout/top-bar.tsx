'use client';

import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-4">
      <div className="md:hidden text-lg font-bold text-primary">
        CRM Negozi
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <OrganizationSwitcher
          hidePersonal
          afterCreateOrganizationUrl="/dashboard"
          afterSelectOrganizationUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: 'flex items-center',
              organizationSwitcherTrigger:
                'rounded-md border border-border px-2 py-1 text-sm',
            },
          }}
        />
        <UserButton />
      </div>
    </header>
  );
}
