"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/auth";
import { SkeletonLoader } from "@/components/skeleton-loader";

export default function RootRouter() {
  const router = useRouter();
  useEffect(() => {
    const role = getRole();
    if (!role) router.replace("/login");
    else router.replace(`/${role}/dashboard`);
  }, [router]);
  return <SkeletonLoader label="Mengarahkan..." />;
}
