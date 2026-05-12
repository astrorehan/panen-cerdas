import { AuthGuard } from "@/components/auth-guard";

export default function PetaniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requiredRole="petani">{children}</AuthGuard>;
}
