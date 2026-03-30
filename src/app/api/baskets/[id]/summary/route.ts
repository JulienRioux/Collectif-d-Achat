import { NextRequest, NextResponse } from "next/server";

import { getBasketById, getBasketSummary } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const basket = getBasketById(id);

  if (!basket) {
    return NextResponse.json(
      { error: { code: "basket_not_found", message: "Basket not found." } },
      { status: 404 }
    );
  }

  const summary = getBasketSummary(id);

  return NextResponse.json({ summary });
}
