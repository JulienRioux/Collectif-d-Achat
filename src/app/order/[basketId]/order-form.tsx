"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeeklyBasket } from "@/lib/domain/types";

interface Props {
  basket: WeeklyBasket;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

export function OrderForm({ basket }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [sectionQuantities, setSectionQuantities] = useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {};
    for (const section of basket.sections) {
      initial[section.id] = String(section.minQuantity);
    }
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedQuantities = useMemo(() => {
    return basket.sections.map((section) => {
      const raw = sectionQuantities[section.id] ?? "0";
      const parsed = Number(raw);
      const quantity = Number.isFinite(parsed)
        ? Math.max(0, Math.floor(parsed))
        : section.minQuantity;

      return {
        section,
        quantity,
      };
    });
  }, [basket.sections, sectionQuantities]);

  const estimatedTotal = useMemo(() => {
    return parsedQuantities.reduce((acc, row) => {
      return acc + row.quantity * row.section.unitPrice;
    }, 0);
  }, [parsedQuantities]);

  const sectionValidationError = useMemo(() => {
    for (const row of parsedQuantities) {
      if (
        row.quantity < row.section.minQuantity ||
        row.quantity > row.section.maxQuantity
      ) {
        return `${row.section.name}: minimum ${row.section.minQuantity}, maximum ${row.section.maxQuantity}.`;
      }
    }

    return null;
  }, [parsedQuantities]);

  const selectedSectionsCount = useMemo(() => {
    return parsedQuantities.reduce((acc, row) => acc + row.quantity, 0);
  }, [parsedQuantities]);

  function updateQuantity(sectionId: string, nextValue: number) {
    const section = basket.sections.find((entry) => entry.id === sectionId);
    if (!section) {
      return;
    }

    const clamped = Math.max(
      section.minQuantity,
      Math.min(section.maxQuantity, Math.floor(nextValue)),
    );

    setSectionQuantities((current) => ({
      ...current,
      [sectionId]: String(clamped),
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      basketId: basket.id,
      customerName,
      sectionSelections: parsedQuantities.map((row) => ({
        sectionId: row.section.id,
        quantity: row.quantity,
      })),
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error?.message ?? "Impossible d'envoyer la commande.");
        return;
      }

      toast.success("Commande enregistree.");
      setCustomerName("");
      setSectionQuantities(() => {
        const reset: Record<string, string> = {};
        for (const section of basket.sections) {
          reset[section.id] = String(section.minQuantity);
        }
        return reset;
      });
    } catch {
      toast.error("Erreur reseau. Veuillez reessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-2xl border bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          Paiement
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Finaliser votre commande
        </h1>
        <p className="mt-1 text-sm text-zinc-600">{basket.weekLabel}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border bg-white p-5">
            <h2 className="text-base font-medium">Vos informations</h2>
            <div className="space-y-1">
              <label
                htmlFor="customer-name"
                className="text-sm font-medium text-zinc-700"
              >
                Nom complet
              </label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Ex. Marie Tremblay"
                required
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">Choix des sections</h2>
              <Badge variant="outline">
                {selectedSectionsCount} section(s)
              </Badge>
            </div>

            {basket.sections.length > 0 ? (
              <div className="space-y-3">
                {basket.sections.map((section) => {
                  const selectedQuantity = Number(
                    sectionQuantities[section.id] ??
                      String(section.minQuantity),
                  );

                  return (
                    <article
                      key={section.id}
                      className="space-y-3 rounded-xl border border-zinc-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-zinc-900">
                            {section.name}
                          </p>
                          <p className="text-sm text-zinc-600">
                            {formatMoney(section.unitPrice)} / section
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Quantite
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Diminuer ${section.name}`}
                              onClick={() =>
                                updateQuantity(section.id, selectedQuantity - 1)
                              }
                              disabled={selectedQuantity <= section.minQuantity}
                            >
                              -
                            </Button>
                            <Input
                              value={
                                sectionQuantities[section.id] ??
                                String(section.minQuantity)
                              }
                              onChange={(event) => {
                                setSectionQuantities((current) => ({
                                  ...current,
                                  [section.id]: event.target.value,
                                }));
                              }}
                              type="number"
                              min={section.minQuantity}
                              max={section.maxQuantity}
                              step={1}
                              className="w-20 text-center"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Augmenter ${section.name}`}
                              onClick={() =>
                                updateQuantity(section.id, selectedQuantity + 1)
                              }
                              disabled={selectedQuantity >= section.maxQuantity}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>

                      {section.products.length > 0 ? (
                        <div className="border-t border-primary/10 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold tracking-wide text-zinc-900">
                              Produits inclus
                            </p>
                            <Badge variant="secondary">
                              {section.products.length} produit(s)
                            </Badge>
                          </div>
                          <div className="mt-3 grid border rounded-md overflow-hidden">
                            {section.products.map((product) => (
                              <span
                                key={product.id}
                                // Hide last border using css
                                className="border-b border-zinc-300 bg-white p-2 text-sm font-medium text-zinc-800 last:border-0"
                              >
                                {product.name}
                                {product.origin ? ` • ${product.origin}` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">
                          Aucun produit dans cette section.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">
                Aucune section affichee pour ce panier.
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section className="space-y-4 rounded-2xl border bg-white p-5">
            <h2 className="text-base font-medium">Resume de commande</h2>

            <div className="space-y-2 border-b border-zinc-200 pb-3">
              {parsedQuantities.map((row) => {
                if (row.quantity === 0) {
                  return null;
                }

                return (
                  <div
                    key={row.section.id}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <p className="text-zinc-700">
                      {row.section.name} x {row.quantity}
                    </p>
                    <p className="font-medium text-zinc-900">
                      {formatMoney(row.quantity * row.section.unitPrice)}
                    </p>
                  </div>
                );
              })}

              {selectedSectionsCount === 0 ? (
                <p className="text-sm text-zinc-500">
                  Aucune section selectionnee.
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-600">Total</p>
              <p className="text-xl font-semibold text-zinc-900">
                {formatMoney(estimatedTotal)}
              </p>
            </div>
            <p className="text-xs text-zinc-500">
              Total calcule selon les sections choisies.
            </p>

            <Button
              className="w-full"
              disabled={isSubmitting || Boolean(sectionValidationError)}
              type="submit"
            >
              {isSubmitting ? "Envoi..." : "Confirmer la commande"}
            </Button>

            {sectionValidationError ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Quantites invalides: {sectionValidationError}
              </p>
            ) : null}

          </section>
        </aside>
      </div>
    </form>
  );
}
