import { notFound } from "next/navigation";

import { AdminMvpClient } from "@/app/admin/admin-mvp-client";
import {
  getBasketSummary,
  listBaskets,
  listOrders,
  listPriceListItems,
} from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  const basket = listBaskets()[0];

  if (!basket) {
    notFound();
  }

  const summary = getBasketSummary(basket.id);
  const orders = listOrders(basket.id).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const priceListItems = listPriceListItems();

  return (
    <div className="w-full space-y-8">
      <AdminMvpClient
        basket={basket}
        summary={summary}
        orders={orders}
        priceListItems={priceListItems}
      />
    </div>
  );
}
