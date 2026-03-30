# 🧺 Collective Buying App — MVP README

## Overview

This project is an MVP for a **collective food buying system** (e.g. Collectif d’achats Youville).

The goal is to replace the current workflow:

> Google Forms → Excel → Manual aggregation

With a simple system:

> Admin creates weekly basket → Members order → Totals auto-generated → Distribution lists ready

---

## 🎯 Goals (MVP)

- Eliminate manual Excel work  
- Automate weekly order aggregation  
- Simplify basket creation and duplication  
- Generate purchase + distribution lists automatically  
- Support one collective only (no multi-tenant yet)

---

## 🚫 Non-goals (for MVP)

- Payments (handled offline)  
- Multi-collective support  
- Complex permissions  
- Supplier integrations  
- Advanced forecasting  

---

## 🧠 Core Concepts

### 1. Products
Reusable catalog items (e.g. Broccoli, Tofu, Flour)

### 2. Weekly Basket
A configuration of products available for a specific week

### 3. Orders
Member selections for a given weekly basket

---

## 🏗️ Data Models (Supabase / Postgres)

### `products`
```sql
id uuid primary key
name text not null
unit text not null
category text not null
supplier text
is_active boolean not null default true
created_at timestamptz not null default now()
```

### `weekly_baskets`
```sql
id uuid primary key
week_label text not null
status text not null check (status in ('draft', 'open', 'closed'))
max_total_amount numeric(10,2) not null default 0
current_total_amount numeric(10,2) not null default 0
created_at timestamptz not null default now()
```

### `weekly_basket_items`
```sql
id uuid primary key
weekly_basket_id uuid not null references weekly_baskets(id) on delete cascade
product_id uuid not null references products(id)
name_snapshot text not null
type text not null check (type in ('base', 'extra'))
price numeric(10,2) not null
max_qty integer
sort_order integer not null default 0
created_at timestamptz not null default now()
```

### `orders`
```sql
id uuid primary key
basket_id uuid not null references weekly_baskets(id) on delete cascade
email text not null
first_name text not null
last_name text not null
phone text
postal_code text
total numeric(10,2) not null
status text not null default 'submitted' check (status in ('submitted', 'cancelled'))
created_at timestamptz not null default now()
```

### `order_items`
```sql
id uuid primary key
order_id uuid not null references orders(id) on delete cascade
product_id uuid not null references products(id)
name_snapshot text not null
qty integer not null check (qty > 0)
price numeric(10,2) not null
line_total numeric(10,2) not null
created_at timestamptz not null default now()
```

---

## 🔄 Core Flows

### 1. Admin creates weekly basket

- Select products from catalog  
- Set price and type  
- Set max total budget  

👉 Can duplicate previous week  

---

### 2. Members place orders

- No login required  
- Select quantities  
- Submit  

System validates budget and calculates total.

---

### 3. Aggregation

- Totals per product  
- Total revenue  

---

### 4. Admin dashboards

- Orders list  
- Purchase list  
- Distribution list  

---

## 🖥️ UI Pages (MVP)

### Public

- `/order/:basketId`

### Admin

- `/admin/baskets`
- `/admin/baskets/:id/edit`
- `/admin/baskets/:id/orders`
- `/admin/baskets/:id/summary`

---

## ⚙️ API Endpoints

### Basket
- `POST /api/baskets`  
- `GET /api/baskets`  
- `GET /api/baskets/:id`  
- `PATCH /api/baskets/:id`  
- `POST /api/baskets/:id/duplicate`  

### Orders
- `POST /api/orders`  
- `GET /api/orders`  

### Summary
- `GET /api/baskets/:id/summary`  

---

## 🔁 Key Features

- Basket duplication  
- Real-time total tracking  
- Snapshot data model  

---

## 🧮 Business Rules

- Orders only when basket is open  
- Max total enforced  
- Weekly fixed prices  
- Basket item names and prices are snapshotted at order time  

---

## 🧰 Stack

- Next.js 15  
- Supabase (Postgres + Auth later if needed)  
- shadcn/ui  

---

## 🚀 Development Plan

1. Products + Basket  
2. Order page  
3. Aggregation  
4. Polish  

---

## 🧭 Summary

Replace:

- Google Forms  
- Excel  

With:

- Structured data  
- Automated totals  
- Repeatable workflow  
