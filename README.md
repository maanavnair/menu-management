# Guestara – Menu & Services Management Backend

## Overview

This project is a backend system for managing a restaurant or service-based business, supporting:

- Categories & Subcategories
- Items (food, rooms, services, etc.)
- Pricing configurations (Static, Tiered, Discounted, Dynamic, Free)
- Availability & booking for bookable items
- Add-ons and add-on groups
- Tax inheritance
- Soft deletes
- Pagination, filtering, sorting, and search

The backend is built with **Node.js**, **Express**, and **Prisma** (with a PostgreSQL/MySQL database).

---

## Architecture
```
src/
├─ controllers/          # API logic for each entity
│  ├─ category.controller.js
│  ├─ subcategory.controller.js
│  ├─ item.controller.js
│  ├─ addon.controller.js
│  └─ booking.controller.js
├─ routes/              # Express route definitions
│  ├─ category.routes.js
│  ├─ subcategory.routes.js
│  ├─ item.routes.js
│  ├─ addon.routes.js
│  └─ booking.routes.js
├─ prisma/            
│  └─ client.js
├─ server.js            # Express server setup
└─ app.js               # Application entry point
```

- **Controllers** handle business logic and validation.
- **Routes** define REST endpoints and middleware.
- **Prisma** handles database interactions, migrations, and schema validation.
- **Server/App** are decoupled to make testing and modularization easier.

---

## Data Modeling Decisions

- **Category**

  - Core entity, can have subcategories and items
  - `taxApplicable` and `taxPercentage` defined here, inherited downstream
  - Soft delete implemented with `isActive`

- **Subcategory**

  - Optional entity under Category
  - Inherits `taxApplicable` and `taxPercentage` from category if not defined
  - Soft delete cascades to items

- **Item**

  - Belongs to either a category or subcategory (never both)
  - Pricing configurations stored in `pricingConfig`
  - Bookable items have `availability` and `bookings`
  - Optional add-ons via `addonGroups`
  - Soft delete handled via `isActive`; cascading from category/subcategory

- **PricingConfig**

  - One pricing type per item
  - Types:
    - `STATIC`: Fixed price
    - `TIERED`: Price based on usage tiers
    - `DISCOUNTED`: Base price minus flat/percentage discount
    - `DYNAMIC`: Price changes based on time windows
    - `FREE`: Always free
  - Implemented using Prisma relations to sub-tables (`tiers`, `discountPrice`, `dynamicWindows`)

- **Availability & Booking**

  - `Availability` defines days of week and time ranges
  - `Booking` references an item and prevents overlapping bookings
  - Validations ensure no double-booking or invalid slots

- **Add-ons**
  - Grouped by `addonGroup`, with optional/mandatory flags
  - Affect final item price

---

## Tax Inheritance

1. Item checks its own `taxApplicable` flag first.
2. If undefined, inherits from subcategory (if exists).
3. If subcategory undefined, inherits from category.
4. Changes in category/subcategory tax automatically reflect on items that inherit tax (no manual updates required).

---

## Pricing Engine

- **Static Pricing:** Returns a fixed base price.
- **Tiered Pricing:** Selects the correct tier based on requested usage.
- **Discounted Pricing:** Applies flat or percentage discounts; ensures price never negative.
- **Dynamic Pricing:** Finds active time window and applies the price; unavailable outside window.
- **Free:** Always returns zero.

- Add-ons are summed on top of base price + tax to produce the final price.

**Example Response from `GET /items/:id/price`:**

```json
{
  "itemId": "cmke0k9800003tsmcbibfs39b",
  "name": "Coffee",
  "pricingType": "STATIC",
  "basePrice": 200,
  "addons": [
    { "id": "cmke0key1000ltsmch5l67fg2", "name": "Extra Shot", "price": 50 },
    { "id": "cmke0key1000mtsmcb81vut6s", "name": "Oat Milk", "price": 40 }
  ],
  "tax": 36,
  "grandTotal": 236,
  "finalPrice": 326
}
```

---

## Trade-offs and Simplifications

- No real-time booking notifications (would require WebSockets)
- Soft deletes only cascade downward (category → subcategory → items), but not upward
- Simplified search filters: supports partial text, price range, category, isActive, and tax applicable. Does not support multi-field complex queries.

---

## Running Locally

### Clone Repository

```bash
git clone https://github.com/maanavnair/menu-management.git
cd menu-management
```

### Install Dependencies

```bash
npm install
```

### Setup Prisma and Database

```bash
npx prisma migrate dev
npx prisma generate
```

### Seed data

```bash
npm run seed
```

### Start server

```bash
npm run dev
```

---
