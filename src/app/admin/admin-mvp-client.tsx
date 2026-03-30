"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  BasketProduct,
  BasketSection,
  BasketSummary,
  Order,
  PriceListItem,
  WeeklyBasket,
} from "@/lib/domain/types";

interface Props {
  basket: WeeklyBasket;
  summary: BasketSummary | null;
  orders: Order[];
  priceListItems: PriceListItem[];
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

function toSafeMoney(value: number) {
  return Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
}

function toSafeInt(value: number) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function isLbsUnit(unit: string | undefined) {
  return (unit ?? "").trim().toUpperCase() === "LBS";
}

function normalizeUnitsPerBasket(value: number, unit: string | undefined) {
  if (isLbsUnit(unit)) {
    return Math.floor(Math.max(0, value) * 10) / 10;
  }

  return Math.max(0, Math.floor(value));
}

function computeSurplusUnits(
  casesToBuy: number,
  unitsPerPack: number,
  totalBaskets: number,
  unit: string | undefined,
) {
  if (totalBaskets <= 0) {
    return 0;
  }

  const totalUnits = casesToBuy * unitsPerPack;
  const unitsPerBasket = normalizeUnitsPerBasket(totalUnits / totalBaskets, unit);
  const distributedUnits = unitsPerBasket * totalBaskets;
  const surplus = totalUnits - distributedUnits;

  if (isLbsUnit(unit)) {
    return Math.max(0, Math.round(surplus * 10) / 10);
  }

  return Math.max(0, Math.floor(surplus));
}

function createEmptySection(): BasketSection {
  return {
    id: crypto.randomUUID(),
    name: "Nouvelle section",
    unitPrice: 0,
    minQuantity: 0,
    maxQuantity: 2,
    products: [],
  };
}

function normalizeSection(section: BasketSection): BasketSection {
  const minQuantity = toSafeInt(section.minQuantity);
  const maxQuantity = Math.max(minQuantity, toSafeInt(section.maxQuantity));

  return {
    ...section,
    name: section.name.trim() || "Section",
    unitPrice: toSafeMoney(section.unitPrice),
    minQuantity,
    maxQuantity,
    products: section.products.map((product) => ({
      ...product,
      name: product.name.trim(),
      origin: product.origin.trim(),
      packPrice: toSafeMoney(product.packPrice),
      primaryPackaging: product.primaryPackaging.trim() || "UN",
      unitsPerPack: Math.max(1, toSafeInt(product.unitsPerPack)),
      casesToBuy: toSafeInt(product.casesToBuy),
    })),
  };
}

export function AdminMvpClient({
  basket,
  summary,
  orders,
  priceListItems,
}: Props) {
  const router = useRouter();
  const [weekLabel, setWeekLabel] = useState(basket.weekLabel);
  const [isOpen, setIsOpen] = useState(basket.isOpen);
  const [sections, setSections] = useState<BasketSection[]>(basket.sections);
  const [randomCount, setRandomCount] = useState("10");
  const [isClearingOrders, setIsClearingOrders] = useState(false);
  const [isImportingPriceList, setIsImportingPriceList] = useState(false);
  const [priceListSearch, setPriceListSearch] = useState("");
  const [unitsPerBasketDrafts, setUnitsPerBasketDrafts] = useState<
    Record<string, string>
  >({});

  const sectionDemandById = useMemo(() => {
    const demand = new Map<string, number>();

    for (const order of orders) {
      for (const selection of order.sectionSelections) {
        demand.set(
          selection.sectionId,
          (demand.get(selection.sectionId) ?? 0) + selection.quantity,
        );
      }
    }

    return demand;
  }, [orders]);

  const sectionBudgetById = useMemo(() => {
    const budget = new Map<string, number>();

    for (const order of orders) {
      for (const selection of order.sectionSelections) {
        budget.set(
          selection.sectionId,
          (budget.get(selection.sectionId) ?? 0) +
            selection.quantity * toSafeMoney(selection.unitPrice),
        );
      }
    }

    return budget;
  }, [orders]);

  function draftKey(sectionId: string, productId: string) {
    return `${sectionId}:${productId}`;
  }

  const filteredPriceListItems = useMemo(() => {
    const search = priceListSearch.trim().toLowerCase();
    if (!search) {
      return priceListItems;
    }

    return priceListItems.filter((item) => {
      const haystack = [
        item.name,
        item.index,
        item.origin,
        item.secondaryPackaging,
        item.primaryPackaging,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [priceListItems, priceListSearch]);

  const allocationTotal = useMemo(() => {
    return sections.reduce((sectionAcc, section) => {
      const sectionCost = section.products.reduce((productAcc, product) => {
        return productAcc + toSafeMoney(product.packPrice) * toSafeInt(product.casesToBuy);
      }, 0);

      return sectionAcc + sectionCost;
    }, 0);
  }, [sections]);

  const requestedTotal = summary?.totalBudget ?? 0;
  const remainingBudget = requestedTotal - allocationTotal;

  const allocatedBudgetBySectionId = useMemo(() => {
    const allocation = new Map<string, number>();

    for (const section of sections) {
      const sectionAllocation = section.products.reduce((acc, product) => {
        return acc + toSafeMoney(product.packPrice) * toSafeInt(product.casesToBuy);
      }, 0);

      allocation.set(section.id, sectionAllocation);
    }

    return allocation;
  }, [sections]);

  async function saveConfig() {
    const normalizedSections = sections.map((section) => normalizeSection(section));

    if (normalizedSections.length === 0) {
      toast.error("Ajoutez au moins une section avant de sauvegarder.");
      return;
    }

    const payload = {
      weekLabel,
      isOpen,
      sections: normalizedSections,
    };

    const response = await fetch(`/api/baskets/${basket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      toast.error(data?.error?.message ?? "Impossible de sauvegarder la configuration.");
      return;
    }

    toast.success("Configuration sauvegardee.");
    router.refresh();
  }

  async function createRandomOrders() {
    const response = await fetch("/api/orders/random", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        basketId: basket.id,
        count: Number(randomCount),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      toast.error(data?.error?.message ?? "Impossible de creer les commandes aleatoires.");
      return;
    }

    toast.success(`${data.createdCount} commande(s) creee(s).`);
    router.refresh();
  }

  async function clearCurrentBasketOrders() {
    const shouldClear = window.confirm(
      "Supprimer toutes les commandes recues pour ce panier ?",
    );
    if (!shouldClear) {
      return;
    }

    setIsClearingOrders(true);

    try {
      const response = await fetch(`/api/orders?basketId=${basket.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error?.message ?? "Impossible de supprimer les commandes.");
        return;
      }

      toast.success(`${data.deletedCount} commande(s) supprimee(s).`);
      router.refresh();
    } finally {
      setIsClearingOrders(false);
    }
  }

  async function importPriceList(file: File) {
    setIsImportingPriceList(true);

    try {
      const csvContent = await file.text();
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error?.message ?? "Impossible d'importer la liste de prix.");
        return;
      }

      toast.success(
        `${data.importedCount} item(s) importe(s) - ${data.createdCount} nouveau(x), ${data.updatedCount} mis a jour.`,
      );
      router.refresh();
    } finally {
      setIsImportingPriceList(false);
    }
  }

  function addSection() {
    setSections((current) => [...current, createEmptySection()]);
  }

  function removeSection(sectionId: string) {
    setSections((current) => current.filter((section) => section.id !== sectionId));
  }

  function updateSection(sectionId: string, patch: Partial<BasketSection>) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              ...patch,
            }
          : section,
      ),
    );
  }

  function updateProduct(
    sectionId: string,
    productId: string,
    patch: Partial<BasketProduct>,
  ) {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        return {
          ...section,
          products: section.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  ...patch,
                }
              : product,
          ),
        };
      }),
    );
  }

  function removeProduct(sectionId: string, productId: string) {
    const key = draftKey(sectionId, productId);

    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        return {
          ...section,
          products: section.products.filter((product) => product.id !== productId),
        };
      }),
    );

    setUnitsPerBasketDrafts((current) => {
      if (!(key in current)) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function addPriceListItemToSection(selected: PriceListItem, sectionId: string) {
    if (!selected) {
      toast.error("Item introuvable dans la liste de prix.");
      return;
    }

    if (!sectionId) {
      toast.error("Selectionnez une section avant d'ajouter un produit.");
      return;
    }

    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        const alreadyInSection = section.products.some(
          (product) => product.name === selected.name,
        );

        if (alreadyInSection) {
          return section;
        }

        return {
          ...section,
          products: [
            ...section.products,
            {
              id: crypto.randomUUID(),
              name: selected.name,
              origin: selected.origin || "N/A",
              packPrice: selected.packPrice,
              primaryPackaging: selected.primaryPackaging || "UN",
              unitsPerPack: selected.unitsPerPack,
              casesToBuy: 0,
            },
          ],
        };
      }),
    );

    toast.success("Produit ajoute a la section. Sauvegardez pour confirmer.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Selection</p>
            <Input value={weekLabel} onChange={(event) => setWeekLabel(event.target.value)} />
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Statut</p>
            <Select
              value={isOpen ? "open" : "closed"}
              onValueChange={(value) => setIsOpen(value === "open")}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Ouvert</SelectItem>
                <SelectItem value="closed">Ferme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" type="button" onClick={addSection}>
              Ajouter une section
            </Button>
            <Button type="button" onClick={saveConfig}>
              Sauvegarder
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-zinc-200 pt-4 sm:grid-cols-4">
          <article className="rounded-xl border border-zinc-200 bg-zinc-50/40 px-3 py-2">
            <p className="text-xs text-zinc-500">Commandes</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{summary?.totalOrders ?? 0}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-zinc-50/40 px-3 py-2">
            <p className="text-xs text-zinc-500">Sections commandees</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{summary?.totalBaskets ?? 0}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-zinc-50/40 px-3 py-2">
            <p className="text-xs text-zinc-500">Budget recu</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatMoney(requestedTotal)}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-zinc-50/40 px-3 py-2">
            <p className="text-xs text-zinc-500">Solde budget</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatMoney(remainingBudget)}</p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Sections du panier</h2>
        </div>

        {sections.length === 0 ? (
          <p className="text-sm text-zinc-600">Aucune section configuree.</p>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => {
              const sectionDemand = sectionDemandById.get(section.id) ?? 0;
              const sectionRequestedBudget = sectionBudgetById.get(section.id) ?? 0;
              const sectionAllocatedBudget = allocatedBudgetBySectionId.get(section.id) ?? 0;
              const sectionBalance = sectionRequestedBudget - sectionAllocatedBudget;

              return (
              <article key={section.id} className="rounded-xl border border-zinc-200 p-3 space-y-3">
                <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50/40 p-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Nom section
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{section.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Prix section
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {formatMoney(section.unitPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Min
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {section.minQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Max
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {section.maxQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Sections commandees
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {sectionDemand}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Budget recu section
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {formatMoney(sectionRequestedBudget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Budget alloue section
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {formatMoney(sectionAllocatedBudget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Solde section
                    </p>
                    <div className="mt-1">
                      <Badge variant={sectionBalance < 0 ? "danger" : "success"}>
                        {formatMoney(sectionBalance)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Sheet>
                    <SheetTrigger render={<Button variant="outline" />}>
                      Modifier section
                    </SheetTrigger>
                    <SheetContent className="overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Modifier section</SheetTitle>
                        <SheetDescription>
                          Mettez a jour le nom, le prix et les bornes min/max.
                        </SheetDescription>
                      </SheetHeader>

                      <div className="mt-4 grid gap-3">
                        <div className="space-y-1">
                          <label
                            htmlFor={`section-name-${section.id}`}
                            className="text-sm font-medium text-zinc-700"
                          >
                            Nom section
                          </label>
                          <Input
                            id={`section-name-${section.id}`}
                            value={section.name}
                            onChange={(event) =>
                              updateSection(section.id, { name: event.target.value })
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor={`section-price-${section.id}`}
                            className="text-sm font-medium text-zinc-700"
                          >
                            Prix section
                          </label>
                          <Input
                            id={`section-price-${section.id}`}
                            value={String(section.unitPrice)}
                            type="number"
                            min={0}
                            step={0.01}
                            onChange={(event) =>
                              updateSection(section.id, {
                                unitPrice: Number(event.target.value),
                              })
                            }
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label
                              htmlFor={`section-min-${section.id}`}
                              className="text-sm font-medium text-zinc-700"
                            >
                              Min
                            </label>
                            <Input
                              id={`section-min-${section.id}`}
                              value={String(section.minQuantity)}
                              type="number"
                              min={0}
                              step={1}
                              onChange={(event) =>
                                updateSection(section.id, {
                                  minQuantity: Number(event.target.value),
                                })
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <label
                              htmlFor={`section-max-${section.id}`}
                              className="text-sm font-medium text-zinc-700"
                            >
                              Max
                            </label>
                            <Input
                              id={`section-max-${section.id}`}
                              value={String(section.maxQuantity)}
                              type="number"
                              min={0}
                              step={1}
                              onChange={(event) =>
                                updateSection(section.id, {
                                  maxQuantity: Number(event.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>

                  <Sheet>
                    <SheetTrigger render={<Button variant="outline" />}>
                      Ajouter un produit
                    </SheetTrigger>
                    <SheetContent className="overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Liste de prix fournisseur</SheetTitle>
                        <SheetDescription>
                          Ajoutez un produit a la section {section.name}.
                        </SheetDescription>
                      </SheetHeader>

                      <div className="mt-4 space-y-1">
                        <label
                          htmlFor={`price-list-file-${section.id}`}
                          className="text-sm font-medium text-zinc-700"
                        >
                          Import CSV
                        </label>
                        <Input
                          id={`price-list-file-${section.id}`}
                          type="file"
                          accept=".csv,text/csv"
                          disabled={isImportingPriceList}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) {
                              return;
                            }

                            void importPriceList(file);
                            event.target.value = "";
                          }}
                        />
                      </div>

                      <div className="mt-4 space-y-2">
                        <label
                          htmlFor={`price-list-search-${section.id}`}
                          className="text-sm font-medium text-zinc-700"
                        >
                          Rechercher
                        </label>
                        <Input
                          id={`price-list-search-${section.id}`}
                          value={priceListSearch}
                          onChange={(event) => setPriceListSearch(event.target.value)}
                          placeholder="Nom, index, origine, emballage..."
                        />
                      </div>

                      <DataTable
                        className="mt-4 overflow-auto rounded-xl border"
                        data={filteredPriceListItems}
                        rowKey={(item) => item.id}
                        headClassName="sticky top-0 bg-zinc-50 text-zinc-600"
                        onRowClick={(item) => addPriceListItemToSection(item, section.id)}
                        emptyState="Aucun item ne correspond a la recherche."
                        columns={[
                          {
                            id: "index",
                            header: "Index",
                            cell: (item) => item.index,
                          },
                          {
                            id: "item",
                            header: "Item",
                            cell: (item) => item.name,
                          },
                          {
                            id: "origin",
                            header: "Origine",
                            cell: (item) => item.origin || "-",
                          },
                          {
                            id: "price",
                            header: "Prix",
                            cell: (item) => formatMoney(item.packPrice),
                          },
                        ]}
                      />
                    </SheetContent>
                  </Sheet>

                  <Button
                    variant="destructive"
                    type="button"
                    onClick={() => removeSection(section.id)}
                  >
                    Supprimer section
                  </Button>
                </div>

                <DataTable
                  className="rounded-xl border"
                  headClassName="bg-zinc-50 text-zinc-600"
                  data={section.products}
                  rowKey={(product) => product.id}
                  emptyState="Aucun produit dans cette section."
                  columns={[
                    {
                      id: "name",
                      header: "Produit",
                      cellClassName: "font-medium text-zinc-900",
                      cell: (product) => product.name,
                    },
                    {
                      id: "origin",
                      header: "Origine",
                      cell: (product) => product.origin,
                    },
                    {
                      id: "packPrice",
                      header: "Prix caisse",
                      cell: (product) => `${formatMoney(product.packPrice)}`,
                    },
                    {
                      id: "unitsPerPack",
                      header: "Unites/caisse",
                      cell: (product) => String(product.unitsPerPack),
                    },
                    {
                      id: "unitCost",
                      header: "Cout unitaire",
                      cell: (product) => {
                        const unitsPerPack = Math.max(1, toSafeInt(product.unitsPerPack));
                        const unitCost = product.packPrice / unitsPerPack;
                        const unitLabel = product.primaryPackaging || "UN";

                        return `${formatMoney(unitCost)} / ${unitLabel}`;
                      },
                    },
                    {
                      id: "casesToBuy",
                      header: "Caisses a acheter",
                      cell: (product) => (
                        <Input
                          value={String(product.casesToBuy)}
                          type="number"
                          min={0}
                          step={1}
                          onChange={(event) => {
                            const key = draftKey(section.id, product.id);
                            updateProduct(section.id, product.id, {
                              casesToBuy: Number(event.target.value),
                            });

                            setUnitsPerBasketDrafts((current) => {
                              if (!(key in current)) {
                                return current;
                              }

                              const next = { ...current };
                              delete next[key];
                              return next;
                            });
                          }}
                        />
                      ),
                    },
                    {
                      id: "totalCost",
                      header: "Cout total",
                      cell: (product) => {
                        const casesToBuy = toSafeInt(product.casesToBuy);
                        return formatMoney(product.packPrice * casesToBuy);
                      },
                    },
                    {
                      id: "unitsPerBasket",
                      header: "Unites/panier",
                      cell: (product) => {
                        const sectionDemand = sectionDemandById.get(section.id) ?? 0;
                        const allowsDecimalUnits = isLbsUnit(product.primaryPackaging);
                        const unitsPerPack = Math.max(1, toSafeInt(product.unitsPerPack));
                        const casesToBuy = toSafeInt(product.casesToBuy);
                        const unitsPerBasket =
                          sectionDemand > 0
                            ? normalizeUnitsPerBasket(
                                (casesToBuy * unitsPerPack) / sectionDemand,
                                product.primaryPackaging,
                              )
                            : 0;
                        const key = draftKey(section.id, product.id);
                        const draftValue = unitsPerBasketDrafts[key];
                        const displayedValue = draftValue ?? String(unitsPerBasket);

                        return (
                          <div className="flex items-center gap-2">
                            <Input
                              value={displayedValue}
                              onChange={(event) => {
                                const rawValue = event.target.value;

                                if (!allowsDecimalUnits && rawValue.includes(".")) {
                                  return;
                                }

                                if (allowsDecimalUnits && !/^\d*(\.\d{0,1})?$/.test(rawValue)) {
                                  return;
                                }

                                setUnitsPerBasketDrafts((current) => ({
                                  ...current,
                                  [key]: rawValue,
                                }));

                                if (rawValue === "") {
                                  return;
                                }

                                const parsedValue = Number(rawValue);
                                if (!Number.isFinite(parsedValue)) {
                                  return;
                                }

                                const targetUnitsPerBasket = normalizeUnitsPerBasket(
                                  parsedValue,
                                  product.primaryPackaging,
                                );

                                if (sectionDemand <= 0) {
                                  toast.error(
                                    "Impossible d'ajuster sans demandes pour cette section.",
                                  );
                                  return;
                                }

                                const nextCasesToBuy = Math.ceil(
                                  (targetUnitsPerBasket * sectionDemand) / unitsPerPack,
                                );

                                updateProduct(section.id, product.id, {
                                  casesToBuy: nextCasesToBuy,
                                });
                              }}
                              type="number"
                              min={0}
                              step={allowsDecimalUnits ? 0.1 : 1}
                              disabled={sectionDemand <= 0}
                              className="w-20"
                            />
                            <span>{product.primaryPackaging || "UN"}</span>
                          </div>
                        );
                      },
                    },
                    {
                      id: "surplus",
                      header: "Surplus",
                      cell: (product) => {
                        const sectionDemand = sectionDemandById.get(section.id) ?? 0;
                        const unitsPerPack = Math.max(1, toSafeInt(product.unitsPerPack));
                        const casesToBuy = toSafeInt(product.casesToBuy);
                        const totalUnits = casesToBuy * unitsPerPack;
                        const key = draftKey(section.id, product.id);
                        const draftValue = unitsPerBasketDrafts[key];

                        if (sectionDemand <= 0 || draftValue === undefined || draftValue === "") {
                          const surplusUnits = computeSurplusUnits(
                            casesToBuy,
                            unitsPerPack,
                            sectionDemand,
                            product.primaryPackaging,
                          );

                          return `${surplusUnits} ${product.primaryPackaging || "UN"}`;
                        }

                        const parsedDraft = Number(draftValue);
                        if (!Number.isFinite(parsedDraft)) {
                          const fallbackSurplus = computeSurplusUnits(
                            casesToBuy,
                            unitsPerPack,
                            sectionDemand,
                            product.primaryPackaging,
                          );

                          return `${fallbackSurplus} ${product.primaryPackaging || "UN"}`;
                        }

                        const targetUnitsPerBasket = normalizeUnitsPerBasket(
                          parsedDraft,
                          product.primaryPackaging,
                        );
                        const distributedUnits = targetUnitsPerBasket * sectionDemand;
                        const rawSurplus = Math.max(0, totalUnits - distributedUnits);
                        const displayedSurplus = isLbsUnit(product.primaryPackaging)
                          ? Math.round(rawSurplus * 10) / 10
                          : Math.floor(rawSurplus);

                        return `${displayedSurplus} ${product.primaryPackaging || "UN"}`;
                      },
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      cell: (product) => (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Actions produit"
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => {
                                const sectionDemand = sectionDemandById.get(section.id) ?? 0;
                                if (sectionDemand <= 0) {
                                  toast.error(
                                    "Impossible de calculer sans demandes pour cette section.",
                                  );
                                  return;
                                }

                                const unitsPerPack = Math.max(
                                  1,
                                  toSafeInt(product.unitsPerPack),
                                );
                                const minCasesToBuy = Math.ceil(sectionDemand / unitsPerPack);

                                updateProduct(section.id, product.id, {
                                  casesToBuy: minCasesToBuy,
                                });

                                const key = draftKey(section.id, product.id);
                                setUnitsPerBasketDrafts((current) => {
                                  if (!(key in current)) {
                                    return current;
                                  }

                                  const next = { ...current };
                                  delete next[key];
                                  return next;
                                });

                                toast.success(
                                  `Caisses ajustees a ${minCasesToBuy} pour viser 1 unite par panier.`,
                                );
                              }}
                            >
                              Min 1/panier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                              onClick={() => removeProduct(section.id, product.id)}
                            >
                              Retirer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ),
                    },
                  ]}
                />
              </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-medium">Commandes recues</h2>

          <div className="flex flex-wrap items-end gap-2">
            <div className="w-36 space-y-1">
              <label htmlFor="random-count" className="text-sm font-medium text-zinc-700">
                Quantite aleatoire
              </label>
              <Input
                id="random-count"
                value={randomCount}
                onChange={(event) => setRandomCount(event.target.value)}
                type="number"
                min={1}
                step={1}
              />
            </div>
            <Button type="button" onClick={createRandomOrders}>
              Creer commandes test
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={clearCurrentBasketOrders}
              disabled={orders.length === 0 || isClearingOrders}
            >
              {isClearingOrders ? "Suppression..." : "Vider commandes"}
            </Button>
          </div>
        </div>

        <DataTable
          className="rounded-xl border"
          data={orders}
          rowKey={(order) => order.id}
          emptyState="Aucune commande pour le moment."
          columns={[
            {
              id: "name",
              header: "Nom",
              cell: (order) => order.customerName,
            },
            {
              id: "sections",
              header: "Sections",
              cell: (order) =>
                order.sectionSelections
                  .map((selection) => `${selection.sectionName}: ${selection.quantity}`)
                  .join(" | "),
            },
            {
              id: "total",
              header: "Total",
              cell: (order) => formatMoney(order.total),
            },
          ]}
        />
      </section>
    </div>
  );
}
