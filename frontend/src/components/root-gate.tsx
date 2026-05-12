"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/auth";

// Phase 3: redirect un-roled and petani users away from "/" (which still
// hosts the pemerintah dashboard until Phase 5 moves it). Pemerintah users
// fall through and see the dashboard.
export function RootGate() {
  const router = useRouter();
  useEffect(() => {
    const role = getRole();
    if (!role) {
      router.replace("/login");
    } else if (role === "petani") {
      router.replace("/petani/dashboard");
    }
  }, [router]);
  return null;
}
