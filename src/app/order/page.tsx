import { redirect } from "next/navigation";

import { getDefaultOpenBasket } from "@/lib/domain/service";

export default function OrderLandingPage() {
  const openBasket = getDefaultOpenBasket();

  if (openBasket) {
    redirect(`/order/${openBasket.id}`);
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-zinc-500">
          Commandes
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Aucun panier ouvert
        </h1>
        <p className="text-zinc-600">
          Aucun panier n&apos;est ouvert pour le moment. Ouvrez le panier depuis la page admin.
        </p>
      </header>
    </div>
  );
}
