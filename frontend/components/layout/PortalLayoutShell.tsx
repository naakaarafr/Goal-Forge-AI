import { TopNavbar } from '@/components/layout/TopNavbar';
import { AuthGuard } from '@/components/auth/AuthGuard';

export function PortalLayoutShell({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
        {/* Sidebar - Desktop */}
        <div className="hidden md:flex md:flex-shrink-0">
          {sidebar}
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 w-0 overflow-hidden">
          <TopNavbar />
          
          <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
            <div className="py-6 px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
