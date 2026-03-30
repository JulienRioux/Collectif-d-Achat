import { NextResponse } from "next/server";

import { listBaskets } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ baskets: listBaskets() });
}
