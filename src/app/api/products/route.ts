import { NextRequest, NextResponse } from "next/server";

import { importPriceListCsv, listPriceListItems } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: listPriceListItems() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const csvContent = typeof body?.csvContent === "string" ? body.csvContent : "";

    const imported = importPriceListCsv(csvContent);

    if ("error" in imported) {
      return NextResponse.json(imported, { status: imported.error.status });
    }

    return NextResponse.json(imported, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_payload", message: "Invalid import payload." } },
      { status: 422 }
    );
  }
}
