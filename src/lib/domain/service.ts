import fs from "node:fs";
import path from "node:path";

import {
  BasketProduct,
  BasketSection,
  BasketSummary,
  BasketSummaryRow,
  CreateOrderInput,
  Order,
  OrderSectionSelection,
  PriceListItem,
  UpdateBasketInput,
  WeeklyBasket,
} from "@/lib/domain/types";

function nowIso() {
  return new Date().toISOString();
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function createId() {
  return crypto.randomUUID();
}

function serializeError(message: string, code: string, status = 400) {
  return {
    error: {
      code,
      message,
      status,
    },
  };
}

const defaultBasketId = "b18f93b6-cfa6-45a6-87d4-cc0bcbd8339f";

type DomainState = {
  baskets: WeeklyBasket[];
  orders: Order[];
  priceList: PriceListItem[];
};

function createSeedState(): DomainState {
  const timestamp = nowIso();

  return {
    baskets: [
      {
        id: defaultBasketId,
        weekLabel: "MVP - Sections de produits",
        isOpen: true,
        sections: [
          {
            id: createId(),
            name: "Vegetables #1",
            unitPrice: 5,
            minQuantity: 0,
            maxQuantity: 2,
            products: [
              {
                id: createId(),
                name: "Poireaux",
                origin: "MX",
                packPrice: 32,
                primaryPackaging: "UN",
                unitsPerPack: 10,
                casesToBuy: 1,
              },
              {
                id: createId(),
                name: "Brocoli en couronnes",
                origin: "MX",
                packPrice: 38,
                primaryPackaging: "UN",
                unitsPerPack: 12,
                casesToBuy: 1,
              },
            ],
          },
          {
            id: createId(),
            name: "Vegetables #2",
            unitPrice: 4,
            minQuantity: 0,
            maxQuantity: 2,
            products: [
              {
                id: createId(),
                name: "Tomates Roma",
                origin: "ON",
                packPrice: 26,
                primaryPackaging: "UN",
                unitsPerPack: 20,
                casesToBuy: 1,
              },
              {
                id: createId(),
                name: "Chou vert",
                origin: "QC",
                packPrice: 24,
                primaryPackaging: "UN",
                unitsPerPack: 8,
                casesToBuy: 1,
              },
            ],
          },
          {
            id: createId(),
            name: "Fruits #1",
            unitPrice: 4,
            minQuantity: 0,
            maxQuantity: 2,
            products: [
              {
                id: createId(),
                name: "Persil italien",
                origin: "MX",
                packPrice: 18,
                primaryPackaging: "UN",
                unitsPerPack: 24,
                casesToBuy: 1,
              },
            ],
          },
          {
            id: createId(),
            name: "Tofu",
            unitPrice: 3,
            minQuantity: 0,
            maxQuantity: 2,
            products: [],
          },
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    orders: [],
    priceList: [],
  };
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const next = line[index + 1];
      if (insideQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseMoneyValue(raw: string) {
  const normalized = raw
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .trim();

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return roundMoney(parsed);
}

function parseUnitsValue(raw: string) {
  const normalized = raw.replace(/,/g, ".").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.floor(parsed));
}

function toPriceListItem(values: string[]) {
  const itemName = values[0]?.trim() ?? "";
  const itemIndex = values[1]?.trim() ?? "";

  if (!itemName || !itemIndex) {
    return null;
  }

  const bioRaw = values[2]?.trim().toUpperCase() ?? "";
  const origin = values[3]?.trim() ?? "";
  const packPrice = parseMoneyValue(values[4] ?? "");
  const secondaryPackaging = values[5]?.trim() ?? "";
  const primaryPackaging = values[6]?.trim() ?? "";
  const unitsPerPack = parseUnitsValue(values[7] ?? "1");

  return {
    id: createId(),
    index: itemIndex,
    name: itemName,
    bio: bioRaw === "BIO",
    origin,
    packPrice,
    secondaryPackaging,
    primaryPackaging,
    unitsPerPack,
  } satisfies PriceListItem;
}

function getStorePath() {
  const configuredPath = process.env.MVP_STORE_PATH?.trim();

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  if (process.env.NODE_ENV === "production") {
    return path.join("/tmp", "mvp-store.json");
  }

  return path.join(process.cwd(), "data", "mvp-store.json");
}

function ensureStoreExists() {
  const storePath = getStorePath();
  const storeDir = path.dirname(storePath);

  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    const initial = createSeedState();
    fs.writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

function normalizeProduct(product: BasketProduct): BasketProduct {
  return {
    ...product,
    primaryPackaging: (product.primaryPackaging ?? "UN").trim() || "UN",
    packPrice: roundMoney(Number(product.packPrice) || 0),
    unitsPerPack: Math.max(1, Math.floor(Number(product.unitsPerPack) || 1)),
    casesToBuy: Math.max(0, Math.floor(Number(product.casesToBuy) || 0)),
  };
}

function normalizeSection(section: BasketSection): BasketSection {
  const minQuantity = Math.max(0, Math.floor(Number(section.minQuantity) || 0));
  const maxQuantity = Math.max(minQuantity, Math.floor(Number(section.maxQuantity) || 0));

  return {
    ...section,
    name: section.name.trim(),
    unitPrice: roundMoney(Number(section.unitPrice) || 0),
    minQuantity,
    maxQuantity,
    products: Array.isArray(section.products)
      ? section.products.map((product) => normalizeProduct(product))
      : [],
  };
}

function readState(): DomainState {
  ensureStoreExists();
  const raw = fs.readFileSync(getStorePath(), "utf8");
  const parsed = JSON.parse(raw) as Partial<DomainState> & {
    baskets?: Array<WeeklyBasket & { products?: BasketProduct[] }>;
  };

  const parsedPriceList = Array.isArray(parsed.priceList) ? parsed.priceList : [];

  if (!Array.isArray(parsed.baskets) || !Array.isArray(parsed.orders)) {
    const resetState = {
      ...createSeedState(),
      priceList: parsedPriceList,
    };
    writeState(resetState);
    return resetState;
  }

  const hasLegacyBaskets = parsed.baskets.some(
    (basket) => {
      const candidate = basket as { products?: unknown; sections?: unknown };
      return Array.isArray(candidate.products) && !Array.isArray(candidate.sections);
    }
  );

  if (hasLegacyBaskets) {
    const resetState = {
      ...createSeedState(),
      priceList: parsedPriceList,
    };
    writeState(resetState);
    return resetState;
  }

  const baskets = parsed.baskets.map((basket) => ({
    ...basket,
    sections: Array.isArray(basket.sections)
      ? basket.sections.map((section) => normalizeSection(section))
      : [],
  }));

  const orders = parsed.orders
    .filter((order): order is Order => Boolean(order && typeof order === "object"))
    .map((order) => ({
      ...order,
      sectionSelections: Array.isArray(order.sectionSelections)
        ? order.sectionSelections.map((selection) => ({
            ...selection,
            quantity: Math.max(0, Math.floor(Number(selection.quantity) || 0)),
            unitPrice: roundMoney(Number(selection.unitPrice) || 0),
          }))
        : [],
      total: roundMoney(Number(order.total) || 0),
    }));

  return {
    baskets,
    orders,
    priceList: parsedPriceList,
  };
}

function writeState(nextState: DomainState) {
  ensureStoreExists();
  fs.writeFileSync(getStorePath(), JSON.stringify(nextState, null, 2), "utf8");
}

export function listBaskets() {
  const state = readState();
  return [...state.baskets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listPriceListItems() {
  const state = readState();
  return [...state.priceList].sort((a, b) => a.name.localeCompare(b.name));
}

export function importPriceListCsv(csvContent: string) {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return serializeError("CSV is empty or missing rows.", "invalid_csv", 422);
  }

  const parsedItems: PriceListItem[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    const parsed = toPriceListItem(values);
    if (parsed) {
      parsedItems.push(parsed);
    }
  }

  if (parsedItems.length === 0) {
    return serializeError("No valid items were found in CSV.", "invalid_csv", 422);
  }

  const state = readState();
  const existingByIndex = new Map(
    state.priceList.map((item) => [item.index.trim().toUpperCase(), item])
  );

  let createdCount = 0;
  let updatedCount = 0;

  state.priceList = parsedItems.map((item) => {
    const key = item.index.trim().toUpperCase();
    const existing = existingByIndex.get(key);

    if (!existing) {
      createdCount += 1;
      return item;
    }

    updatedCount += 1;
    return {
      ...item,
      id: existing.id,
    };
  });

  writeState(state);

  return {
    importedCount: parsedItems.length,
    createdCount,
    updatedCount,
    items: parsedItems,
  };
}

export function getBasketById(id: string) {
  const state = readState();
  return state.baskets.find((basket) => basket.id === id);
}

export function getDefaultOpenBasket() {
  const state = readState();
  return state.baskets.find((basket) => basket.isOpen) ?? null;
}

export function updateBasket(basketId: string, patch: UpdateBasketInput) {
  const state = readState();
  const basket = state.baskets.find((entry) => entry.id === basketId);
  if (!basket) {
    return serializeError("Basket not found.", "basket_not_found", 404);
  }

  if (patch.weekLabel !== undefined) {
    basket.weekLabel = patch.weekLabel;
  }

  if (patch.isOpen !== undefined) {
    basket.isOpen = patch.isOpen;
  }

  if (patch.sections !== undefined) {
    basket.sections = patch.sections.map((section) => normalizeSection(section));
  }

  basket.updatedAt = nowIso();
  writeState(state);
  return basket;
}

export function listOrders(basketId?: string) {
  const state = readState();
  return basketId
    ? state.orders.filter((order) => order.basketId === basketId)
    : [...state.orders];
}

export function clearOrders(basketId?: string) {
  const state = readState();
  const beforeCount = state.orders.length;

  if (basketId) {
    const basket = state.baskets.find((entry) => entry.id === basketId);
    if (!basket) {
      return serializeError("Basket not found.", "basket_not_found", 404);
    }

    state.orders = state.orders.filter((order) => order.basketId !== basketId);
  } else {
    state.orders = [];
  }

  const deletedCount = beforeCount - state.orders.length;
  writeState(state);

  return { deletedCount };
}

function mapSectionSelections(
  basket: WeeklyBasket,
  payload: CreateOrderInput
): OrderSectionSelection[] | ReturnType<typeof serializeError> {
  const sectionById = new Map(basket.sections.map((section) => [section.id, section]));
  const quantityBySectionId = new Map<string, number>();

  for (const selection of payload.sectionSelections) {
    if (!sectionById.has(selection.sectionId)) {
      return serializeError("Order contains an unknown section.", "invalid_section", 422);
    }

    if (quantityBySectionId.has(selection.sectionId)) {
      return serializeError("Order contains duplicate section selections.", "invalid_section", 422);
    }

    quantityBySectionId.set(selection.sectionId, Math.max(0, Math.floor(selection.quantity)));
  }

  const normalized: OrderSectionSelection[] = [];

  for (const section of basket.sections) {
    const quantity = quantityBySectionId.get(section.id) ?? 0;

    if (quantity < section.minQuantity || quantity > section.maxQuantity) {
      return serializeError(
        `Section ${section.name} must be between ${section.minQuantity} and ${section.maxQuantity}.`,
        "section_quantity_out_of_bounds",
        422
      );
    }

    normalized.push({
      sectionId: section.id,
      sectionName: section.name,
      quantity,
      unitPrice: roundMoney(section.unitPrice),
    });
  }

  return normalized;
}

export function createOrder(payload: CreateOrderInput) {
  const state = readState();
  const basket = state.baskets.find((entry) => entry.id === payload.basketId);
  if (!basket) {
    return serializeError("Basket not found.", "basket_not_found", 404);
  }

  if (!basket.isOpen) {
    return serializeError("Basket is not open for ordering.", "basket_not_open", 409);
  }

  const sectionSelections = mapSectionSelections(basket, payload);
  if ("error" in sectionSelections) {
    return sectionSelections;
  }

  const total = roundMoney(
    sectionSelections.reduce((acc, selection) => acc + selection.quantity * selection.unitPrice, 0)
  );

  const order: Order = {
    id: createId(),
    basketId: payload.basketId,
    customerName: payload.customerName,
    sectionSelections,
    total,
    createdAt: nowIso(),
  };

  state.orders.push(order);
  writeState(state);

  return { order };
}

const randomFirstNames = [
  "Alex",
  "Sam",
  "Marie",
  "Nora",
  "Leo",
  "Camille",
  "Louis",
  "Emma",
  "Jules",
  "Maya",
];

const randomLastNames = [
  "Tremblay",
  "Gagnon",
  "Roy",
  "Cote",
  "Lefebvre",
  "Bouchard",
  "Girard",
  "Cloutier",
  "Martel",
  "Bergeron",
];

function randomItem<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomIntBetween(min: number, max: number) {
  if (max <= min) {
    return min;
  }

  return min + Math.floor(Math.random() * (max - min + 1));
}

export function createRandomOrders(basketId: string, count: number) {
  const basket = getBasketById(basketId);
  if (!basket) {
    return serializeError("Basket not found.", "basket_not_found", 404);
  }

  if (!basket.isOpen) {
    return serializeError("Basket is not open for ordering.", "basket_not_open", 409);
  }

  const safeCount = Math.max(1, Math.min(500, Math.floor(count)));
  const created: Order[] = [];

  for (let index = 0; index < safeCount; index += 1) {
    const customerName = `${randomItem(randomFirstNames)} ${randomItem(randomLastNames)}`;
    const sectionSelections = basket.sections.map((section) => ({
      sectionId: section.id,
      quantity: randomIntBetween(section.minQuantity, section.maxQuantity),
    }));

    const result = createOrder({ basketId, customerName, sectionSelections });

    if ("error" in result) {
      return result;
    }

    created.push(result.order);
  }

  return {
    createdCount: created.length,
    orders: created,
  };
}

export function getBasketSummary(basketId: string): BasketSummary | null {
  const basket = getBasketById(basketId);
  if (!basket) {
    return null;
  }

  const orders = listOrders(basketId);
  const totalOrders = orders.length;
  const totalBaskets = orders.reduce(
    (acc, order) =>
      acc + order.sectionSelections.reduce((sectionAcc, selection) => sectionAcc + selection.quantity, 0),
    0
  );
  const totalBudget = roundMoney(orders.reduce((acc, order) => acc + order.total, 0));

  const sectionDemandById = new Map<string, number>();
  for (const order of orders) {
    for (const selection of order.sectionSelections) {
      sectionDemandById.set(
        selection.sectionId,
        (sectionDemandById.get(selection.sectionId) ?? 0) + selection.quantity
      );
    }
  }

  const byProduct: BasketSummaryRow[] = basket.sections.flatMap((section) => {
    const sectionDemand = sectionDemandById.get(section.id) ?? 0;

    return section.products.map((product: BasketProduct) => {
      const packsToBuy = Math.max(0, Math.floor(product.casesToBuy));
      const spent = roundMoney(packsToBuy * product.packPrice);
      const totalUnits = packsToBuy * product.unitsPerPack;
      const unitsPerBasket = sectionDemand > 0 ? Math.floor(totalUnits / sectionDemand) : 0;
      const allocatedBudget = spent;

      return {
        sectionId: section.id,
        sectionName: section.name,
        productId: product.id,
        name: product.name,
        origin: product.origin,
        primaryPackaging: product.primaryPackaging,
        casesToBuy: packsToBuy,
        allocatedBudget,
        packsToBuy,
        totalUnits,
        unitsPerBasket,
        spent,
      };
    });
  });

  const totalSpent = roundMoney(byProduct.reduce((acc, row) => acc + row.spent, 0));

  return {
    basketId,
    totalOrders,
    totalBaskets,
    totalBudget,
    totalSpent,
    remainingBudget: roundMoney(totalBudget - totalSpent),
    byProduct: byProduct.sort((a, b) => b.allocatedBudget - a.allocatedBudget),
  };
}
