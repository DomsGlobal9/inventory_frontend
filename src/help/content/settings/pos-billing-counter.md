---
title: Connect your POS till
summary: Link the ScaleEzy POS at your billing counter to this Inventory, so every bill takes stock out here and reaches the Day Book by itself. Make the key, paste it in the till, and replace or disconnect it later.
for: The owner, admins and inventory managers
minutes: 3
app: /settings?section=POS
appLabel: POS (billing counter)
keywords: pos till billing counter point of sale connect till key till key paste inventory link replace key disconnect new sale moved walk-in bills bills at the pos left out bill not added scaleezy pos counter
---

The **ScaleEzy POS** is the till at your billing counter. Every walk-in bill is made on it, not in Inventory. Connect it once, and from then on every bill made on the till:

- takes the pieces out of that store's stock here,
- shows up in **Orders**, marked **POS till**,
- and counts in the **Day Book**, with its GST.

You make a **key** here and paste it into the till. Only people who can add and change stores see this. In the ready roles, that is the owner, **ADMIN** and **INVENTORY_MANAGER**.

## 1. Open POS (billing counter)

1. In the menu on the left, click [[1]] **Settings**.
2. Under **Money**, click [[2]] **POS (billing counter)**.

![The Settings page. Settings is marked 1 in the menu and POS (billing counter), under Money, is marked 2.](1-open.webp "A till is not a website, so it is not under Connected websites.")

## 2. Make a key for the till

1. [[1]] In **Sells from**, choose the store the counter sells from. Its stock goes down with each bill.
2. [[2]] Give the till a name if you like, for example *Main counter*.
3. Press [[3]] **Create key**.

![Connect a till. Sells from is marked 1, Name (optional) 2 and Create key 3.](2-connect.webp "Two counters in one store? Make a key for each.")

## 3. Copy the key, then paste it in the till

The key appears **only this once**.

1. Press [[2]] **Copy**. The key [[1]] is now copied.
2. On the till, open **More → Settings → Inventory link**, paste the key, and press **Connect**.
3. On the till, press **Refresh items from Inventory**. Your products, prices, GST and stock arrive on the till.
4. Back here, press **I have copied it**. The key disappears for good.

![The key, shown once. The key is marked 1 and Copy is marked 2. The steps for the till are written under it.](3-key-once.webp "Lost the key? Use Replace key below; there is no way to see it again.")

## 4. Your tills

Every connected till is listed with its store, the start of its key, and when the last bill came in from that store.

- [[1]] **Replace key** makes a new key. The old key stops working at once. The till stops sending bills until you paste the new key in it. Bills it already sent are safe.
- [[2]] **Disconnect** stops the key for good.

Both ask first.

![A connected till, Main counter at Main Store. Replace key is marked 1 and Disconnect is marked 2.](4-your-tills.webp "No bills yet changes to Connected after the first bill.")

## Walk-in bills are made on the till

Inventory has no counter bill of its own. Every walk-in bill, for every store, is made on the ScaleEzy POS till, so a store never has two lists of bill numbers. In **Orders**, where the New sale button used to be, each store shows a note instead:

- [[1]] A store with a connected till: *Main Store bills at the POS. Make the sale on the till. It shows up here, takes the stock out and reaches the Day Book on its own.*
- A store with no till yet: *Walk-in bills are made on the ScaleEzy POS till. Connect a till in Settings → POS (billing counter), and every bill it makes shows up here on its own.*

![Sales Orders. Where the New sale button used to be, a note is marked 1: Main Store bills at the POS. Make the sale on the till. It shows up here, takes the stock out and reaches the Day Book on its own.](6-new-sale-steps-aside.webp "A store with no till yet shows the note that says to connect one.")

People whose role includes counter sales see the note, on a computer or tablet.

What stays in Inventory:

- **Returns** of bills made at Inventory's own counter: **Returns → Take a return**. See [Take a return at the counter](/help/returns/take-a-return). A bill made on the till is returned on the till, and that return reaches Inventory by itself.
- Receipts of older bills made at Inventory's counter can still be printed again from the order. The till prints its own bills. See [Print or reprint a receipt](/help/orders/receipts).
- Loyalty points, till rules and offer codes are still set here. See [Loyalty points](/help/customers/loyalty-points) and [Till rules](/help/offers/till-rules).

To see only the till's bills in **Orders**, choose **POS till** in the **Where from** box.

Each bill is dated by when the till made it, not when it reached Inventory. A bill made just before midnight, or by a till that was offline and sends its bills the next morning, still counts on the day it was made, in **Orders** and in the [Day Book](/help/settings/day-book). Only the Day Book's stock movements list its pieces on the day the bill reached Inventory.

## GST on the till's bills

GST is optional. The till takes everything about it from Inventory, so you set it in one place:

- **What kind of bill it prints** follows **Settings → Name, logo and bill details** (see [Shop details](/help/settings/shop-details)):
  - GST registered (Regular) with a GSTIN saved: a **tax invoice**, with CGST and SGST.
  - Composition scheme with a GSTIN saved: a **Bill of Supply**, with no GST on it.
  - No GSTIN saved, or not registered: a **plain receipt**, with no GST. This is fine; nothing is held up.
- **The GST rate of each item** comes from the product in Inventory when the till refreshes its items. An item with no rate still sells. In a GST registered shop it is billed at 0% and the till shows a quiet note, so you can add the rate later.
- **The shop's name, address, phone, GSTIN and logo** on the bill come from the same settings page.
- **A business customer with a GSTIN**: the bill shows *Bill to* with their name, GSTIN and address. Inventory keeps those on the order and on the customer, if the customer has none saved.
- **A bill of ₹50,000 or more to a customer without a GSTIN**: the till asks for their name and address. It never stops the sale if they are not given. When they are, the bill shows *Bill to* with them, and so does its receipt in Inventory.
- **Rounding**: the till rounds the bill to the nearest rupee. Inventory keeps the round-off with the bill, so it reads as fully paid.

Each bill keeps the kind it was printed as. Changing your GST settings later does not change bills already made.

## Credit (udhaar) bills

A customer can take the goods and pay later. The till sends the bill with what was paid at the counter, and the order in **Orders** shows the rest as **₹… due**.

- **Paid later**: when the balance is collected on the till, it reaches the order by itself, with its UPI or card reference. The due goes down, and at ₹0 the order reads **Paid**.
- Loyalty points are earned on what is paid, as it is paid. See [Loyalty points](/help/customers/loyalty-points).
- **Written off**: if the customer never pays, a manager can write the balance off on the till, with a reason. The order then shows **Written off**, with the amount, the reason, who approved it and when, and nothing is due. No money came in, so takings and the Day Book do not change, and the GST bill stays as it was issued.
- **Paid after all**: if a written-off customer pays later, the money is recorded as usual and the written-off amount goes down by the same sum.

## Bills not added to Inventory

Very rarely, the till cannot send a bill, for example because its item was deleted here for good. The person at the till can then choose to **leave that bill out**, with a reason. Its pieces are **not** taken off your stock here, and its money is **not** in your Day Book.

Those bills are listed here, with the store, the day, the reason and who did it. They stay listed even after the till is disconnected.

[[1]] An exchange is listed under its new bill number. Beside it, *shown as … at the till* is the number the till showed, usually the credit note, so you can find the same bill on the till.

![Bills not added to Inventory. The exchange INV/2026-27/0009, shown as CN/2026-27/0002 at the till, is marked 1. Under it is INV/2026-27/0007 at Main Store, with the reason The saree on this bill was deleted in Inventory for good, by Priya Reddy.](5-left-out.webp "Count those pieces at your next stock check.")

## Common problems

:::faq The till says the key is not right
The key was replaced or disconnected here, or a website key was pasted by mistake. Make a new key with **Create key**, or press **Replace key** on the till's line, and paste it in the till again.
:::

:::faq "That is a website key, not a till key"
Keys from **Connected websites** only work for websites. Make the till's key here, in **POS (billing counter)**.
:::

:::faq Where did New sale go?
Inventory no longer makes walk-in bills; the ScaleEzy POS till does, for every store. See [Walk-in bills are made on the till](#walk-in-bills-are-made-on-the-till).
:::

:::faq A bill from the till is not in Orders yet
The till sends bills by itself, a few seconds after each one. If the internet is down at the counter, it keeps them and sends them when the line is back. The till's own **Inventory link** screen says what is waiting.
:::

:::faq I don't see POS (billing counter) in Settings
Only people who can add and change stores see it. Ask your owner.
:::
