"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isOrderPath = pathname === "/order" || pathname.startsWith("/order/");

  return (
    <nav className="w-full border-b border-gray-200 bg-white z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4">
          <span className="text-2xl leading-none" aria-hidden="true">
            🥦
          </span>
          <span className="font-bold text-xl tracking-tight">
            Collectif d&apos;Achat
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {!isAdminPath ? (
            <Button variant="outline" render={<Link href="/admin" />}>
              Admin
            </Button>
          ) : null}
          {!isOrderPath ? (
            <Button render={<Link href="/order" />}>Commander</Button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
