import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { createRandomOrders } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

const createRandomOrdersSchema = z.object({
  basketId: z.string().uuid(),
  count: z.coerce.number().int().min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = createRandomOrdersSchema.parse(body);

    const created = createRandomOrders(payload.basketId, payload.count);

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
            message: "Invalid random order payload.",
            details: error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "unknown_error",
          message: "Unable to create random orders.",
        },
      },
      { status: 500 }
    );
  }
}
