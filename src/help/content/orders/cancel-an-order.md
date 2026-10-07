---
title: Cancel an order
summary: Cancel an order that will not be sent, so the stock it was holding can be sold again.
for: Admins and owners
minutes: 1
app: /orders
appLabel: Orders
keywords: cancel order delete remove release stock reserved close rest refuse customer changed mind paid online razorpay refund money back
---

Only admins and the owner can cancel an order.

## 1. Open the order and click Cancel Order

1. Find the order. See [Find an order](/help/orders/find-an-order).
2. Check it is [[1]] **Confirmed**. (If part of it was already sent, the button is called **Close rest of order** instead.)
3. Click [[2]] **Cancel Order**.

![A confirmed order for Farah Khan. The Confirmed label is marked 1 and the red Cancel Order button is marked 2.](1-cancel-order.webp "Cancel Order is under Create Dispatch.")

## 2. Say yes

Read the message and click [[1]] **Cancel order**. This cannot be undone.

![The Cancel this order? box. The red Cancel order button is marked 1.](2-confirm.webp "Click Cancel instead to keep the order.")

## 3. Check it worked

The order now says [[1]] **Cancelled**. It holds no stock: [[2]] **RESERVED** is 0 on every line, and the pieces can be sold again.

![The cancelled order. The Cancelled label is marked 1 and the RESERVED column, showing 0, is marked 2.](3-cancelled.webp "The order stays in your list with the Cancelled status.")

## If the customer paid online

When the order was paid online through Razorpay, cancelling it sends the whole amount back to the customer by itself, through Razorpay, to however they paid. It reaches them in 5–7 working days. You do not hand over any money. You can follow it in **Settings → Money → Online payments and refunds**. See [Take payments online](/help/online-shop/take-payments-online).

If the refund could not even be started, you get a red alert at the bell saying the customer has NOT been refunded. Refund them from that list, or from your Razorpay Dashboard.

## Part of it was already sent

If some pieces have gone out, the button says **Close rest of order** instead. What was sent stays a sale. Only the pieces not sent go back on sale. If the order was paid online, nothing goes back by itself here: give back what you choose with **Refund** in **Online payments and refunds**. See step 5 of [Send out an online order](/help/orders/send-online-orders).

## Common problems

:::faq I don't see Cancel Order
Only admins and the owner can cancel. The order must also be **Confirmed** or partly sent.
:::

:::faq The order is a DRAFT and has no Cancel Order button
A draft holds no stock, so nothing needs to be released. There is no button to cancel a draft on this screen. Leave it as a draft, or ask your ScaleEzy contact for help if it must be removed.
:::

:::faq The order is already Dispatched
Everything has gone out, so it cannot be cancelled. If the customer sends the goods back, book a return. See [Book in a return](/help/returns/book-a-return).
:::

:::faq A counter sale was a mistake
A counter sale is complete as soon as it is made. Book the pieces back in as a return. See [Book in a return](/help/returns/book-a-return).
:::
