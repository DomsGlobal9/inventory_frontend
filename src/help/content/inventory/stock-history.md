---
title: Stock history
summary: Every piece that came in, went out or was corrected, with when, why and who did it.
for: Owners, managers and stock room staff
minutes: 2
app: /inventory/ledger
appLabel: Inventory Ledger
keywords: ledger history movements log in out adjustment balance who changed trail record audit trail
---

## 1. Open the ledger

1. In the menu on the left, click **Inventory**.
2. At the top right, click [[1]] **View Ledger**.

![The Inventory screen. The View Ledger button at the top right is marked 1.](1-open.webp "Newest changes are at the top.")

The **Inventory Ledger** lists every stock change in your shop, newest first.

![The Inventory Ledger with sales, deliveries and corrections for several items.](2-ledger.webp "50 changes per page. Use Next at the bottom for older ones.")

## 2. See one item only

On the item's line in **Inventory**, click the clock button (View Ledger) at the end of the line. Now only that item's changes show.

1. [[1]] The line *Viewing history for specific variant.* means you are looking at one item only. **Clear Filter** shows all items again.
2. [[2]] **Type**: **IN** (came in), **OUT** (went out) or **ADJ** (corrected).
3. [[3]] **Qty Change**: how many pieces, **+** for in and **−** for out.
4. [[4]] **Balance After**: how many the store had right after this change.
5. [[5]] **User / System**: who did it. **System** means the app did it, for example when an order was sent.

![The ledger for Chanderi Dupatta. The filter note is marked 1, Type 2, Qty Change 3, Balance After 4 and User / System 5.](3-one-item.webp "Read from the bottom up to follow the item's story.")

The **Reason** column says why (for example PURCHASE RECEIPT, SALE, DAMAGE, AUDIT). **Reference** shows the purchase order number or bill number when there is one. For a sent order it shows DISPATCH and a long code.

:::note Nothing here can be changed or deleted
The ledger is a permanent record. To fix a mistake, make a new correction with [Correct stock](/help/inventory/correct-stock). Both lines then show.
:::

## Common problems

:::faq The ledger shows changes from another store
The ledger lists every store together and has no store column. **Balance After** is the stock of the store where that change happened. Open one item's history to follow it more easily.
:::

:::faq A shelf move is not in the list
Putting pieces on a shelf or moving them between shelves does not change your stock, so it is not listed here. Each shelf keeps its own list: open **Shelves → Racks & shelves**, click the shelf in the tree, then click **History**. Only the owner, an admin or an inventory manager can open **Racks & shelves**. See [Set up racks and print labels](/help/shelves/set-up-racks#shelf-history).
:::

:::faq I cannot find an old change
Only 50 changes show per page. Press **Next** at the bottom of the list.
:::
