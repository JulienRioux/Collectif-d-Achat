import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getBasketById, updateBasket } from "@/lib/domain/service";
import { updateBasketSchema } from "@/lib/domain/validation";

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

  return NextResponse.json({ basket });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const payload = updateBasketSchema.parse(body);

    const updated = updateBasket(id, payload);

    if ("error" in updated) {
      return NextResponse.json(updated, { status: updated.error.status });
    }

    return NextResponse.json({ basket: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_payload",
            message: "Invalid basket update payload.",
            details: error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: { code: "unknown_error", message: "Unable to update basket." } },
      { status: 500 }
    );
  }
}
