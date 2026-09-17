---
title: Working with more than one store
summary: Pick the store you are working in at the top of the screen, and know which numbers belong to that store and which are the same everywhere.
for: Everyone
minutes: 3
app: /dashboard
appLabel: ScaleEzy
keywords: store switch change location branch godown warehouse picker top bar wrong store numbers different two shops second shop main store all locations
---

If your shop has more than one place that holds stock, for example a shop and a godown, each one is a **store** in ScaleEzy. Every store has its own stock. You work in one store at a time.

The owner, an admin or an inventory manager adds stores and godowns in **Settings → Stock Locations**. See [Stores and godowns](/help/settings/locations).

## 1. Pick your store

1. Click [[1]] the store name at the top of the screen, next to the pin.
2. Click [[2]] the store you want to work in. Each store shows its name and its code.

![The store list open at the top of the screen. The store box is marked 1 and Godown is marked 2.](1-store-picker.webp "The screen reloads to show the store you picked.")

The screen reloads and everything now belongs to that store. Your choice is remembered **on this device**, so a till in the shop and a computer in the godown can each stay on their own store.

:::tip A half-finished sale is not lost
A **New sale** you have started is kept for each store on this device. Switch back to that store and it is still there.
:::

## 2. What follows the store you picked

These change when you switch store:

| Screen | What you see |
|---|---|
| **Inventory** | Stock numbers and stock value of this store only. **Receive Stock**, **Issue Stock** and **Adjust Stock** change this store. |
| **Alerts** (the bell) | Low stock and out of stock alerts for this store. A saree can be low in the shop and fine in the godown. |
| **New sale** | You sell from this store. The screen says **Selling from** and the store name. |
| **Purchase Orders** | A new order is delivered to this store unless you change **Deliver to**. |
| **Shelves** | **Where is it?**, **Put away**, **Move**, **Pick**, **Count** and the racks all use this store's shelves. |
| **Reorder** | Suggestions use this store's stock and orders. |
| **Price labels** | The price printed on a label is this store's price, if it has one. |
| **Dashboard** | The first tile is **Inventory Value** for this store. Under it you see the value across all stores. |

![The Inventory Value tile for Main Store, marked 1. The line under the amount gives the value across all locations.](2-inventory-value.webp "Inventory Value shows the store name when your shop has more than one store.")

:::note Where is it? in every store
In **Where is it?**, tick **Look in every location** to search all your stores at once.
:::

## 3. What is the same in every store

These do not change when you switch store:

- **Reorder level.** One number per size and colour, used by every store.
- **Price.** A size and colour has one price everywhere, unless you set a different price for a store. See [A different price in one store](/help/products/price-per-store).
- **Total Stock** on a product's **Variants** tab. It adds up all your stores.

![The Variants tab of a product. The Total Stock column is marked 1.](3-total-stock.webp "Total Stock is all stores together.")

- **In Stock** on a supplier's products. It adds up all your stores.
- **Stock history** (the ledger). It lists changes from every store together.

## 4. Screens where you choose the store yourself

- **Transfers**: you choose where the stock comes from and where it goes. See [Move stock between stores](/help/transfers/transfers).
- **Day Book**: choose a store, or all of them, on the Day Book itself. See [Day Book (close the day)](/help/settings/day-book).
- **Import Products**: imported stock always goes to **one** store, the switched-on store whose code comes first in A to Z order. It does not use the store at the top of the screen. See [Import products from a sheet](/help/products/import-products).

## Godowns and shops

Each store has a type: **Retail Store**, **Warehouse** or **Online / Virtual**. Inside ScaleEzy a godown works just like a shop: it has its own stock, shelves and alerts, and you can even sell from it. To move pieces from the godown to the shop, use a [transfer](/help/transfers/transfers).

## Common problems

:::faq The numbers look wrong
Check the store name at the top of the screen first. Most wrong numbers are the right numbers for a different store.
:::

:::faq Total Stock and the Inventory number are different
**Inventory** shows the store you picked. **Total Stock** on the product adds up all your stores. Both are right.
:::

:::faq A closed store is still in the list
A store that is switched off still shows in the store list. Do not pick it for work: it cannot sell, take orders or receive deliveries. Pick your working store instead.
:::

:::faq I only see one store
The store list shows every store your shop has. If yours is missing, ask your owner or manager to add it in **Settings → Stock Locations**.
:::
