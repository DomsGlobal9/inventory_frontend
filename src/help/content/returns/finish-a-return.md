---
title: Receive, check and finish a return
summary: When returned goods arrive, mark them received, check each piece, and finish the return so good pieces go back into stock.
for: Stock room staff, admins and owners
minutes: 3
app: /returns
appLabel: Returns
keywords: return received arrive inspect check restock damaged scrap complete finish refund put back stock turn down reject
---

A return moves through four steps: **REQUESTED** (booked in) → **RECEIVED** (the goods arrived) → **INSPECTED** (checked) → **COMPLETED** (finished). Stock only changes at the last step.

To book a return in first, see [Book in a return](/help/returns/book-a-return).

:::note Who can do this
With the standard roles, **stock room staff, admins and the owner**. Sales staff and inventory managers do not see Returns.
:::

## 1. Open the return

1. In the menu on the left, click [[1]] **Returns**.
2. Click [[2]] the return that has arrived. New returns say **REQUESTED**.

![The Customer Returns list. Returns is marked 1 in the left menu and a REQUESTED return for Lakshmi Narayanan is marked 2.](1-open.webp "The newest return is at the top.")

## 2. Mark it as received

When the parcel or the customer's bag is in your hands:

1. [[1]] Check the status says **REQUESTED**.
2. Click [[2]] **Mark as Received**.

![The return page. The REQUESTED status is marked 1 and the Mark as Received button is marked 2.](2-mark-as-received.webp "Returned Items shows what should be in the parcel. Count it.")

The status changes to **RECEIVED**.

## 3. Check each piece

1. Click **Inspect Items**.
2. [[1]] For each item, choose what happens to it:
   - **Restock (Add to Inventory)**: it is fine. It goes back into stock.
   - **Damaged**: it cannot be sold. It does not go back into stock.
   - **Scrap**: it is thrown away. It does not go back into stock.

![The Inspect Items box with its list open. The list is marked 1 and shows Choose, Restock (Add to Inventory), Damaged and Scrap.](3-choose-list.webp "Every item needs a choice.")

3. Click [[2]] **Save Dispositions**.

![The Inspect Items box. DUP-CHA-PCH set to Restock is marked 1 and the Save Dispositions button is marked 2.](3-inspect-items.webp "Save Dispositions stays grey until every item has a choice.")

The status changes to **INSPECTED**.

## 4. Complete the return

1. [[1]] Check the choice for each item in the **Disposition** column. Wrong? Click **Inspect Items** again and change it.
2. Click [[2]] **Complete Return**.

![The return page after checking. Restock in the Disposition column is marked 1 and the Complete Return button is marked 2.](4-complete-return.webp "After Complete Return you cannot change the choices.")

The status changes to **COMPLETED**. Pieces marked Restock are added back to the stock of the store the order was sold from.

## 5. Put it on a shelf and give the money back

1. [[1]] If your shop uses shelves, a yellow box says how many pieces are not on a shelf yet. Click **Put away**. See [Put away stock](/help/shelves/put-away).
2. [[2]] **Refund owed to the customer** shows what they paid for these items, after discounts.

![The completed return. The yellow box with 1 piece of this return is not on a shelf yet at Main Store and a Put away button is marked 1. Refund owed to the customer, 980 rupees, is marked 2.](5-put-away.webp "The refund is what the customer paid, not the price on the tag.")

:::warning ScaleEzy does not pay the refund
It only shows the amount. Give the money back the way your shop always does, for example cash or UPI. For a Shopify order refunded in Shopify, it says **Refunded through Shopify**.
:::

## Common problems

:::faq I don't see Returns in the menu
Your role cannot see returns. With the standard roles, sales staff and inventory managers do not have it. Ask your shop owner.
:::

:::faq Save Dispositions is grey
One or more items still say **Choose…**. Choose Restock, Damaged or Scrap for every item.
:::

:::faq The goods never came, or the return was booked by mistake
Open the return and click **Turn down**, then **Turn down** again in the box. Nothing goes back into stock and nothing is owed. You can do this until the return is completed.
:::

:::faq I chose Restock but the piece is damaged
Before **Complete Return**, click **Inspect Items** and change it. After completing, the piece is already back in stock. Take it out with [Remove stock](/help/inventory/remove-stock).
:::

:::faq There is no yellow Put away box
Your shop does not use shelves, your role cannot put stock away, or the pieces are already on a shelf.
:::
