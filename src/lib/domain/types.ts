export interface BasketProduct {
  id: string;
  name: string;
  origin: string;
  packPrice: number;
  primaryPackaging: string;
  unitsPerPack: number;
  casesToBuy: number;
}

export interface BasketSection {
  id: string;
  name: string;
  unitPrice: number;
  minQuantity: number;
  maxQuantity: number;
  products: BasketProduct[];
}

export interface PriceListItem {
  id: string;
  index: string;
  name: string;
  bio: boolean;
  origin: string;
  packPrice: number;
  secondaryPackaging: string;
  primaryPackaging: string;
  unitsPerPack: number;
}

export interface WeeklyBasket {
  id: string;
  weekLabel: string;
  isOpen: boolean;
  sections: BasketSection[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderSectionSelection {
  sectionId: string;
  sectionName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  basketId: string;
  customerName: string;
  sectionSelections: OrderSectionSelection[];
  total: number;
  createdAt: string;
}

export interface CreateOrderInput {
  basketId: string;
  customerName: string;
  sectionSelections: {
    sectionId: string;
    quantity: number;
  }[];
}

export interface UpdateBasketInput {
  weekLabel?: string;
  isOpen?: boolean;
  sections?: BasketSection[];
}

export interface BasketSummaryRow {
  sectionId: string;
  sectionName: string;
  productId: string;
  name: string;
  origin: string;
  primaryPackaging: string;
  casesToBuy: number;
  allocatedBudget: number;
  packsToBuy: number;
  totalUnits: number;
  unitsPerBasket: number;
  spent: number;
}

export interface BasketSummary {
  basketId: string;
  totalOrders: number;
  totalBaskets: number;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  byProduct: BasketSummaryRow[];
}
