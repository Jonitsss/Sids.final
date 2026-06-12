"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function StandaloneRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (isStandalone && pathname === "/") {
      router.replace("/login");
    }
  }, [pathname, router]);

  return null;
}
