import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { clearOrders, createOrder, listOrders } from "@/lib/domain/service";
import { createOrderSchema } from "@/lib/domain/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const basketId = request.nextUrl.searchParams.get("basketId") ?? undefined;

  return NextResponse.json({ orders: listOrders(basketId) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = createOrderSchema.parse(body);

    const created = createOrder(payload);

    if ("error" in created) {
      return NextResponse.json(created, { status: created.error.status });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_payload",
            message: "Invalid order payload.",
            details: error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: { code: "unknown_error", message: "Unable to place order." } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const basketId = request.nextUrl.searchParams.get("basketId") ?? undefined;
  const cleared = clearOrders(basketId);

  if ("error" in cleared) {
    return NextResponse.json(cleared, { status: cleared.error.status });
  }

  return NextResponse.json(cleared);
}
