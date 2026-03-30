import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getDefaultOpenBasket } from "@/lib/domain/service";

export default function Home() {
  const openBasket = getDefaultOpenBasket();

  return (
    <section className="mx-auto w-full py-12 sm:py-20">
      <div className="space-y-6">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          Collectif d&apos;achats Youville
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Bienvenue sur le collectif d&apos;achats de Youville
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
          Ce projet vise à faciliter la gestion des commandes groupées pour les
          résidents de Ahuntsic-Cartierville et les environs.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="outline" render={<Link href="/admin" />}>
            Aller a l&apos;admin
          </Button>

          {openBasket ? (
            <Button render={<Link href={`/order/${openBasket.id}`} />}>
              Commander un panier
            </Button>
          ) : (
            <Button render={<Link href="/order" />}>Voir les commandes</Button>
          )}
        </div>
      </div>
    </section>
  );
}
