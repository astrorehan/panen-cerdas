"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRole, type Role } from "@/lib/auth";
import { SkeletonLoader } from "@/components/skeleton-loader";

interface AuthGuardProps {
  requiredRole: Role;
  children: React.ReactNode;
}

export function AuthGuard({ requiredRole, children }: AuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    const role = getRole();
    if (role === requiredRole) {
      setStatus("ok");
    } else {
      setStatus("denied");
      router.replace("/login");
    }
  }, [requiredRole, router]);

  if (status !== "ok") {
    return <SkeletonLoader label="Memeriksa akses..." />;
  }
  return <>{children}</>;
}
