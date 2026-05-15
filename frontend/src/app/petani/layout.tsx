import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/sidebar";

export default function PetaniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="petani">
      <div className="min-h-screen md:flex">
        <Sidebar role="petani" />
        <main className="flex-1 w-full bg-muted/20">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
