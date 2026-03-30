import { notFound } from "next/navigation";

import { getBasketById } from "@/lib/domain/service";

import { OrderForm } from "./order-form";

interface Props {
  params: Promise<{ basketId: string }>;
}

export default async function OrderBasketPage({ params }: Props) {
  const { basketId } = await params;
  const basket = getBasketById(basketId);

  if (!basket) {
    notFound();
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      {basket.isOpen ? (
        <OrderForm basket={basket} />
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ce panier est ferme. Les commandes sont acceptees seulement quand le
          panier est ouvert.
        </div>
      )}
    </div>
  );
}
