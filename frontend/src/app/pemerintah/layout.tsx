import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/sidebar";

export default function PemerintahLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="pemerintah">
      <div className="min-h-screen md:flex">
        <Sidebar role="pemerintah" />
        <main className="flex-1 w-full bg-muted/20">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
