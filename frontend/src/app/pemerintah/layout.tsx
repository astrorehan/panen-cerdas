import { AuthGuard } from "@/components/auth-guard";

export default function PemerintahLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requiredRole="pemerintah">{children}</AuthGuard>;
}
