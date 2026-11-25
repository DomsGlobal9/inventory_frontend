---
title: Your POS till
summary: ScaleEzy switches the POS on for your shop, so every bill made at your counter takes stock out here and reaches the Day Book by itself. Nothing to set up by hand.
for: The owner, admins and inventory managers
minutes: 3
app: /settings?section=POS
appLabel: POS (billing counter)
keywords: pos till billing counter point of sale switched on by scaleezy welcome link email sign in password pin new sale moved walk-in bills bills at the pos left out bill not added scaleezy pos counter sending to inventory has stopped refused bill
---

The **ScaleEzy POS** is the till at your billing counter. Every walk-in bill is made on it, not in Inventory. Connect it once, and from then on every bill made on the till:

- takes the pieces out of that store's stock here,
- shows up in **Orders**, marked **POS till**,
- and counts in the **Day Book**, with its GST.

POS is switched on **by ScaleEzy**, for your shop. Nothing is set up by hand: there is no key to make, copy or paste.

1. You ask ScaleEzy to switch POS on (or your Boutique app's administrator does it there).
2. The owner gets an **email** with a sign-in link. They open it, choose a password and a 4-number PIN, and the till opens with your products, prices, GST and stock already in it.
3. From then on every bill made on the till reaches Inventory by itself.

Until POS is switched on for your shop, Inventory shows nothing about it.

:::tip How to use the till itself
The till has its own guide, for cashiers, managers and owners: [ScaleEzy POS Help](https://pos.scaleezy.com/help). This page is about what you see of the till in Inventory.
:::

## What you see in Settings

Once POS is on, **Settings → POS (billing counter)** shows:

- **Status**: on, switched on by ScaleEzy.
- **Bill at**: the till's address, to open on the counter's computer or tablet.
- **Signing in**: the email or phone the owner signs in with. Staff are added on the till's own Staff screen.
- **Counters**: which store each counter sells from, and when its last bill came in.
- **Bills not added to Inventory**, if any (see [below](#bills-not-added-to-inventory)).

Only people who can add and change stores see it. In the ready roles, that is the owner, **ADMIN** and **INVENTORY_MANAGER**.

To add a counter, turn POS off, or when the owner cannot sign in, contact ScaleEzy. The till's key is made and changed automatically.

## Walk-in bills are made on the till

Inventory has no counter bill of its own. Every walk-in bill, for every store, is made on the ScaleEzy POS till, so a store never has two lists of bill numbers. In **Orders**, where the New sale button used to be, each store shows a note instead:

- [[1]] A store with a till: *Main Store bills at the POS. Make the sale on the till. It shows up here, takes the stock out and reaches the Day Book on its own.*
- A shop without POS sees no note.

![Sales Orders. Where the New sale button used to be, a note is marked 1: Main Store bills at the POS. Make the sale on the till. It shows up here, takes the stock out and reaches the Day Book on its own.](6-new-sale-steps-aside.webp "A shop without POS sees no note.")

People whose role includes counter sales see the note, on a computer or tablet.

What stays in Inventory:

- **Returns** of bills made at Inventory's own counter: **Orders**, the **Returns** tab, then **Take a return**. See [Take a return at the counter](/help/returns/take-a-return). A bill made on the till is returned on the till, and that return reaches Inventory by itself.
- Receipts of older bills made at Inventory's counter can still be printed again from the order. The till prints its own bills. See [Print or reprint a receipt](/help/orders/receipts).
- Loyalty points, till rules and offer codes are still set here. See [Loyalty points](/help/customers/loyalty-points) and [Till rules](/help/offers/till-rules).

To see only the till's bills in **Orders**, choose **POS till** in the **Where from** box.

Each bill is dated by when the till made it, not when it reached Inventory. A bill made just before midnight, or by a till that was offline and sends its bills the next morning, still counts on the day it was made, in **Orders** and in the [Day Book](/help/settings/day-book). Only the Day Book's stock movements list its pieces on the day the bill reached Inventory.

Returns on the till follow your rule in **Settings → Returns and exchanges** here. A bill older than the days in **Take returns within** needs a manager's PIN on the till; it is never refused. Leave the box empty for no limit.

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
- **Bank transfer and cheque**: for big bills paid by NEFT, IMPS, RTGS or cheque, the till keeps the payment as *to check* until the owner sees the money arrive or the cheque clear. Only then does it reach the order, as **Bank transfer** (with the bank's UTR) or **Cheque** (with the cheque number and bank). A cheque that bounces is never counted, so the bill still shows it as due.
- Loyalty points are earned on what is paid, as it is paid. See [Loyalty points](/help/customers/loyalty-points).
- **Written off**: if the customer never pays, a manager can write the balance off on the till, with a reason. The order then shows **Written off**, with the amount, the reason, who approved it and when, and nothing is due. No money came in, so takings and the Day Book do not change, and the GST bill stays as it was issued.
- **Paid after all**: if a written-off customer pays later, the money is recorded as usual and the written-off amount goes down by the same sum.

## Bills not added to Inventory

Very rarely, the till cannot send a bill, for example because its item was deleted here for good. The person at the till can then choose to **leave that bill out**, with a reason. Its pieces are **not** taken off your stock here, and its money is **not** in your Day Book.

Those bills are listed here, with the store, the day, the reason and who did it. They stay listed even after the till is disconnected.

[[1]] An exchange is listed under its new bill number. Beside it, *shown as … at the till* is the number the till showed, usually the credit note, so you can find the same bill on the till.

![Bills not added to Inventory. The exchange INV/2026-27/0009, shown as CN/2026-27/0002 at the till, is marked 1. Under it is INV/2026-27/0007 at Main Store, with the reason The saree on this bill was deleted in Inventory for good, by Priya Reddy.](5-left-out.webp "Count those pieces at your next stock check.")

## Common problems

:::faq The till says it is not connected to Inventory
Contact ScaleEzy. They switch POS on again for your shop, which gives the till a fresh connection by itself.
:::

:::faq Where did New sale go?
Inventory no longer makes walk-in bills; the ScaleEzy POS till does, for every store. See [Walk-in bills are made on the till](#walk-in-bills-are-made-on-the-till).
:::

:::faq A bill from the till is not in Orders yet
The till sends bills by itself, a few seconds after each one. If the internet is down at the counter, it keeps them and sends them when the line is back. The till's own **Inventory link** screen says what is waiting. If it says **Sending to Inventory has stopped**, see [below](#the-till-says-sending-to-inventory-has-stopped).
:::

:::faq The till says "Sending to Inventory has stopped"
Inventory could not take one bill, for example because an item on it is not in this shop. The till holds that bill and every bill after it, safely. Nothing is lost.

The owner opens **More → Inventory link** on the till, which says which bill and why. Fix the cause here in Inventory, then press **I've fixed it — try again** on the till. If the bill should not be in Inventory, press **Leave … out of Inventory?** and give a reason. Cashiers see the message, but only the owner can fix it.
:::

:::faq I don't see POS (billing counter) in Settings
It shows only once ScaleEzy has switched POS on for your shop, and only to people who can add and change stores. Ask your owner, or ScaleEzy.
:::
