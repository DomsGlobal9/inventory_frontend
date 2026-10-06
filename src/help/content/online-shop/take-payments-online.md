---
title: Take payments online
summary: Connect your own Razorpay account so customers can pay by UPI or card at the checkout. The money goes straight to you. Then see each payment and refund it if you need to.
for: The owner
minutes: 4
app: /settings?section=PAYMENTS
appLabel: Razorpay account
keywords: payments pay online razorpay upi card gateway key id key secret api keys webhook live mode test keys test mode refund money back online payment checkout settlement
---

Your online shop can take payment at the checkout, by UPI or card. The money goes into **your own Razorpay account**, never through ScaleEzy. Razorpay's fees are between you and Razorpay.

You need a Razorpay account in **Live mode**. Only the owner can connect it.

## 1. Open your Razorpay settings

1. In the menu on the left, click [[1]] **Settings**.
2. Under **Money**, click [[2]] **Razorpay account**.

![The Settings page. Settings is marked 1 in the menu and Razorpay account, under Money, is marked 2.](1-open.webp "Online payments and refunds, just under it, lists the payments once you take them.")

## 2. Copy your keys from Razorpay

In your **Razorpay Dashboard**, in **Live mode**:

1. Go to **Account & Settings → API Keys → Generate Key**.
2. Razorpay shows a **Key ID** and a **Key Secret**. Keep that page open: it shows the secret only once.

## 3. Paste them here

1. [[1]] Paste the **Key ID**. It starts with `rzp_live_`.
2. [[2]] Paste the **Key Secret**.
3. Press [[3]] **Save and check**. ScaleEzy checks the keys with Razorpay before it keeps them.

![The Payments card. Key ID is marked 1, Key Secret 2 and Save and check 3.](2-connect.webp "The secret is kept locked away and is never shown again.")

## 4. The last step: tell Razorpay where to confirm payments

After the keys are saved, the card shows a **Webhook URL** and a **Secret**. This is how Razorpay tells your shop that a customer has paid.

1. In Razorpay, go to **Account & Settings → Webhooks → Add New Webhook**.
2. Paste the **Webhook URL** from ScaleEzy.
3. Paste the **Secret** from ScaleEzy. **It is shown only now**, so copy it before you leave the page.
4. Tick the events ScaleEzy lists: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed` and `refund.failed`. Then save.

When everything is in place, the card says **Your account is ready**.

## 5. Switch on paying online in your shop

Go to **Settings → Online shop**. Under **How customers may pay**, tick **Online (UPI, card — Razorpay)**. See [Taking orders](/help/online-shop/taking-orders).

From now on, a customer can pay at the checkout. The order arrives in **Orders** already paid.

:::warning TEST keys take no real money
Keys that start with `rzp_test_` are Razorpay's **test** keys. A customer can go right through the checkout and the order says paid, but no money reaches you. ScaleEzy says so in red. Use your **Live** keys before you sell for real.
:::

## 6. See payments and give money back

Under **Money**, click **Online payments and refunds**. Every online payment is listed with the order, the customer and how much has been given back.

To give money back (only people allowed to give money back at the counter see **Refund**):

1. On the payment, click **Refund**.
2. Type how much. You cannot give back more than was paid.
3. Type **why**. The customer does not see this; it is for your own records.
4. Press **Refund ₹…**.

The money goes back through Razorpay to however the customer paid. It reaches them in **5–7 working days**.

:::tip Returns refund by themselves
When you finish a return for an order that was paid online, the money goes back through Razorpay in the same way. There is no cash to hand over. See [Finish a return](/help/returns/finish-a-return).
:::

## Change or remove your Razorpay account

Under the connected account:

- **Replace keys**: paste new keys, for example after you generated new ones in Razorpay.
- **New webhook secret**: makes a new secret. Paste it into the webhook in Razorpay straight away.
- **Disconnect**: stops online payments. Customers can still pay when the parcel arrives.

**New webhook secret** and **Disconnect** ask first.

## Common problems

:::faq The Online box is greyed out in Settings → Online shop
Razorpay is not connected yet, or its keys are not working. Open **Settings → Razorpay account** and look at what the card says.
:::

:::faq "Your Razorpay keys are not working"
The keys were changed or removed in Razorpay. Generate new keys in Razorpay, then use **Replace keys** here. Until then, customers can still pay when the parcel arrives.
:::

:::faq A customer paid, but the order does not say paid
Check the webhook in Razorpay (step 4): the address, the secret and the ticked events. ScaleEzy also asks Razorpay by itself every few minutes, so the order catches up shortly.
:::

:::faq "A refund did not go through"
The message under the payment says why. **The customer has not been refunded.** Fix the cause in Razorpay, for example your Razorpay balance, then refund again.
:::

:::faq I don't see Razorpay account in Settings
Only people who manage the online shop see it, and only the owner can connect an account.
:::
