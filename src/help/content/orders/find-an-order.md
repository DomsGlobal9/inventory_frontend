---
title: Find an order
summary: Look up any sale or order, filter by date, payment or where it came from, download the list to Excel, and record money collected later.
for: Sales staff, stock room staff, admins and owners
minutes: 4
app: /orders
appLabel: Orders
keywords: order search look up find sale bill number phone item code filter date this month last 30 days status payment not paid due part paid where from pos till online shop shopify kept order collect handed over amount sort most due export excel download record payment pay on delivery cash on delivery collected
---

Every sale lives in **Orders**: bills from your POS till, online orders, Shopify orders and older sales made at Inventory's own counter.

## 1. Open Orders

In the menu on the left, click [[1]] **Orders**. The newest orders are at the top, 50 at a time; **Show more** at the bottom brings the next 50. If your role includes counter sales, a note at the top right says walk-in bills are made on the ScaleEzy POS till. See [Connect your POS till](/help/settings/pos-billing-counter).

![The Sales Orders list. Orders is marked 1 in the left menu. Each row shows the order number, customer, where it came from, total, status and payment.](1-open.webp "WHERE FROM says POS till for bills from the till, and Online for orders from your online shop.")

Each row shows:

- **WHERE FROM**: *POS till*, *Online*, *Shopify*, *Counter* (bills made in Inventory before 6 Oct 2026) or *Order*, with the store and who made it.
- **STATUS**: *Draft*, *Confirmed*, *Partly sent*, *Dispatched* or *Cancelled*. A kept order also says *Kept · collect 25 Oct*, *Kept · was due 22 Oct* (the day has gone) or *Handed over*.
- **PAYMENT**: *Paid*, or how much is still due (for example *₹500 due*). A Shopify order (paid on Shopify) and a cancelled order with nothing paid show **—**: nothing is owed. *Written off* means the balance of a credit (udhaar) bill was written off on the POS till.

## 2. Search, filter and sort

1. [[1]] Type an **order number**, the **bill number** from the till, a **phone number**, a **name** or an **item code**. The list changes as you type.
2. [[2]] Use the filter buttons. Each one opens a short list with how many orders every choice would leave.
   - **Any date**: *Today*, *Yesterday*, *Last 7 days*, *Last 30 days*, *This month*, *Last month*, or two dates of your own.
   - **Status**: for example only *Confirmed* orders still waiting to be sent.
   - **Payment**: *Not paid*, *Part paid*, *Paid*, *Written off* or *Refunded*.
   - **Where from**: *POS till*, *Online shop*, *Shopify*, *Counter* or *Typed in*.
   - **Kept orders**: *Waiting for collection*, *Past the promised date* or *Handed over*.
   - **Store** (when you have more than one) and **Amount**.
3. [[3]] The line under the filters says how many orders match, what they come to **in sales** (cancelled orders and drafts are left out) and how much of it is still **due**.
4. **Sort** puts them newest first, oldest first, by amount, or **Most due first**: the orders owing the most at the top.

Each choice shows as a chip under the filters. Click its **✕** to remove it, or **Clear all**.

![The search box with 98480 22338 typed is marked 1, the filter buttons 2, the count line 3 and Export to Excel 4. Eight orders for that phone number are listed.](2-search-and-filters.webp "Searching by phone finds every order made with that number.")

![The Payment filter open: Not paid 4 and Paid 3.](2-payment-filter.webp "The number beside a choice is how many orders it would leave, with your other filters on.")

:::tip Send a list to someone
The filters you choose are in the page's address. Copy it and send it, and the other person sees the same list, for example "this month, not paid".
:::

## 3. Download the list to Excel

Click [[4]] **Export to Excel**. Every order that matches your search and filters is downloaded, not only the 50 on screen: order and bill number, date, store, where from, customer, status, pieces, total, paid, refunded, written off, due, payment, and for kept orders the promised day and when it was handed over.

## 4. Read the order

Click **View** on a row. The order page shows:

1. [[1]] The order number, status, customer, date, store and who made it.
2. [[2]] **Taken from shelves**: which shelf each piece was taken from. You only see this if your shop uses shelves.
3. [[3]] **Line Items**: each item with how many were ordered, are still held (**RESERVED**) and were sent (**DISPATCHED**).
4. [[4]] **Summary**: the total, and every discount with its reason. **OFFER** is a running offer. **BY HAND** is a discount given by hand.
5. [[5]] **Payments**: how it was paid, when and by whom. At the top right it says **Paid** or how much is **due**. A refund for a return is written on the return, not here.

![The order page for SO-000001. The heading is marked 1, Taken from shelves 2, Line Items 3, Summary 4 and Payments 5.](3-read-the-order.webp "On a small screen, scroll the Line Items table sideways to see the prices.")

A **kept order** from the till (goods kept in the shop for the customer to collect) also has a **Kept for the customer** box: the day the customer said they would collect, and when it was handed over. Handing over is done on the POS till; it shows here by itself.

What you can do next depends on the order:

- A bill made at Inventory's own counter: [Print or reprint a receipt](/help/orders/receipts). A till bill is printed by the till.
- A confirmed order: [Send out an online order](/help/orders/send-online-orders).
- An order that is not needed: [Cancel an order](/help/orders/cancel-an-order).

## 5. Record money collected later

An online order paid on delivery, or an order typed in by hand, is paid after it is made. When the money comes in:

1. Open the order. In **Payments**, click [[1]] **Record payment**.

![The Payments box of SO-000003 with ₹12,980 due and the Record payment button marked 1.](4-record-button.webp "You see the button only when money can be recorded here, and only if your role may take payment.")

2. [[1]] Choose how it was paid: **Cash**, **UPI**, **Card**, **Bank transfer** or **Cheque**.
3. [[2]] The amount starts at what is due. Change it if only part was paid; it cannot be more than the due. For cash you can type what was handed over, to see the change. For the others you can keep a reference: the UPI number, the last 4 digits or approval code of the card (never the card number), or the cheque number.
4. Click [[3]] **Record**.

![The Record payment box for SO-000003, ₹12,980 due. The ways to pay are marked 1, the amount 2 and the Record button 3.](4-record-payment.webp "Counted in today's Day Book, at this order's store.")

The payment is counted in today's **Day Book** at the order's store, and the order's payment changes to *Part paid* or *Paid*.

:::note A till bill is paid on the till
For a bill made on the POS till, take the rest of the money on the till, so the till and Inventory both know. The order page says so instead of showing the button.
:::

## On a phone

On a phone the orders are shown as cards. Tap a card to open the order. The filter buttons scroll sideways, and each opens from the bottom of the screen.

![Orders on a phone, shown as cards with order number, total, customer, date and status.](5-on-a-phone-phone.webp "Search, filters, sort and Export work the same on a phone.")

## Common problems

:::faq I can't find an order
Click **Clear all** under the filters, then search again with fewer digits or only the first name. Check the date filter: an order outside the dates is not listed.
:::

:::faq I don't see Orders in the menu
Your role does not include orders. Sales staff, stock room staff, admins and owners see Orders. Ask your shop owner.
:::

:::faq The payment says due
Less money was recorded than the order total. Open the order and check **Payments**. If the customer has paid since, use **Record payment** (or, for a till bill, take it on the till).
:::

:::faq I don't see Record payment
It shows only when money can be recorded here and your role may take payment (*Sell at the counter and take payment*). It is not shown for a till bill, a Shopify order, a cancelled or draft order, or an order with nothing due.
:::

:::faq The Excel file has more orders than I see
The file has every order that matches, not only the 50 on screen. Click **Show more** to see the rest on screen.
:::
