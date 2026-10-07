---
title: Take payments online
summary: Connect your own Razorpay account so customers can pay by UPI, card or net banking at the checkout. The money goes straight to you. Then see every payment, give money back, and know what happens by itself.
for: The owner
minutes: 8
app: /settings?section=PAYMENTS
appLabel: Razorpay account
keywords: payments pay online razorpay upi card net banking gateway key id key secret api keys webhook live mode test keys test mode refund money back online payment checkout settlement paid twice payment failed needs looking at returned automatically cancelled order refund 5-7 days
---

Your online shop can take payment at the checkout, by UPI, card or net banking. The money goes into your own Razorpay account, never through ScaleEzy. Razorpay's fees are between you and Razorpay.

Before you start you need:

- A Razorpay account that is activated for Live mode (Razorpay asks for your business documents first).
- To be the owner of the shop in ScaleEzy. Only the owner can connect, change or remove the account.
- Ten minutes, with your Razorpay Dashboard open in another tab.

Each shop connects its own Razorpay account. One Razorpay account cannot be connected to two shops on ScaleEzy.

## 1. Open your Razorpay settings

1. In the menu on the left, click [[1]] **Settings**.
2. Under **Money**, click [[2]] **Razorpay account**.

![The Settings page. Settings is marked 1 in the menu and Razorpay account, under Money, is marked 2.](1-open.webp "Online payments and refunds, just under it, lists the payments once you take them.")

## 2. Copy your keys from Razorpay

In your **Razorpay Dashboard**, switched to **Live mode** (the switch is at the top of the dashboard):

1. Go to **Account & Settings → API Keys → Generate Key**.
2. Razorpay shows a **Key ID** and a **Key Secret**. Keep that page open: Razorpay shows the secret only once. If you lose it, generate a new key and use the new pair.

## 3. Paste them here

1. [[1]] Paste the **Key ID**. A live key starts with `rzp_live_`.
2. [[2]] Paste the **Key Secret**.
3. Press [[3]] **Save and check**. ScaleEzy asks Razorpay if the keys work before it keeps them.

![The Payments card. Key ID is marked 1, Key Secret 2 and Save and check 3.](2-connect.webp "The secret is kept locked away and is never shown again.")

If Razorpay accepts them, a green message says **Razorpay accepted your keys**. The Key Secret is stored locked (encrypted) and is never shown again, to you or anyone.

If something is wrong, the card says what, in one line. For example *That does not look like a Razorpay Key ID* means the first box has something else in it: copy the Key ID again from the API Keys page.

## 4. The last step: tell Razorpay where to confirm payments

Right after the keys are saved, a yellow box appears: **Last step: tell Razorpay where to confirm payments**. A payment only counts when Razorpay itself tells your shop about it, never because a customer's phone said so. This step sets that up.

1. In Razorpay, go to **Account & Settings → Webhooks → Add New Webhook**.
2. Click **Copy** next to the **Webhook URL** in ScaleEzy, and paste it into Razorpay's **Webhook URL** box.
3. Click **Copy** next to the **Secret** in ScaleEzy, and paste it into Razorpay's **Secret** box. This secret is shown only now. Copy it before you leave the page.
4. In Razorpay, tick these five events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed` and `refund.failed`. Then press **Create Webhook** in Razorpay.
5. Back in ScaleEzy, press **I have added it in Razorpay**. The yellow box closes.

The Webhook URL stays on the card afterwards, so you can copy it again any time. The secret does not. If you lost it before pasting it in Razorpay, make a new one with **New webhook secret** (see *Change or remove your Razorpay account* below).

## 5. Read what the card says

Once connected, the top of the card shows one line with the account's state, the Key ID (partly hidden) and **Live** or **Test**:

- **Connected** (green): the keys work and they are Live keys. Customers can pay you.
- **Connected with TEST keys** (orange): the keys work, but they are Razorpay's practice keys. See the warning below.
- **Not checked yet** (orange): the keys were saved, but Razorpay has not answered yet. Press **Check it works**.
- **Not working** (red): Razorpay refused the keys. The line under it says why. Usually the keys were changed or deleted in Razorpay: generate new ones and use **Replace keys**.

**Check it works** asks Razorpay again, at any time. Use it after you change anything in Razorpay. The time of the last check is shown under the line.

At the bottom, one sentence says what customers can do right now: *Customers can pay online at your checkout*, or what is still missing.

:::warning TEST keys cannot take a real customer's money
Keys that start with `rzp_test_` are Razorpay's test keys, for practising. With test keys your checkout does not offer paying online: the **Online** box in Settings → Online shop stays greyed out, and customers pay when the parcel arrives. Connect your **Live** keys (they start with `rzp_live_`) to take real payments. If you want to try the whole checkout with test keys first, ask ScaleEzy to switch test mode on for you. In test mode an order can say paid when no money arrived, so it is never left on for real selling.
:::

## 6. Switch on paying online in your shop

Go to **Settings → Online shop**. Under **How customers may pay**, tick **Online (UPI, card — Razorpay)** and save. See [Taking orders](/help/online-shop/taking-orders).

You can tick it only when the card says **Connected** with Live keys. Until then the box is greyed out and a line under it says what to fix.

You can keep **When it arrives (cash or UPI)** ticked as well. Then the customer chooses.

## 7. What your customer sees

1. At the checkout the customer chooses **Pay now** (*UPI, card or net banking — securely through Razorpay*) and presses the pay button.
2. Razorpay's own payment window opens over your shop. The customer pays there. ScaleEzy never sees their card or UPI PIN.
3. While they pay, the pieces in their bag are held for them for 20 minutes, so nobody else can buy the last piece in the meantime. If they do not pay in that time, the pieces go back on sale.
4. When the payment goes through, the order arrives in your **Orders** already marked paid, and the customer sees their order page. The shop confirms the order on WhatsApp as usual.

If something goes differently, the customer sees one of these:

- **Waiting for your payment**: Razorpay has not confirmed it yet. They can close the page. If the payment goes through, the order is made by itself.
- **No payment was taken**: the payment failed or was cancelled. Their bag is still there and they can try again.
- **Your money is going back**: they paid, but the order could not be made (see step 10). The money returns to them by itself.

The smallest amount that can be paid online is ₹1.

## 8. Where an online payment shows up

- **Orders**: the order says **Paid**. On the order page, under payments, the line says **Online (Razorpay)** with the amount.
- **Day Book**: online payments are counted under **Online (Razorpay)**, apart from cash, so your cash drawer still adds up.
- Receipt and bill PDF: *Paid by Online (Razorpay)*.
- **Settings → Money → Online payments and refunds**: the full list (next step).

The money itself reaches your bank from Razorpay, on Razorpay's own settlement schedule. Check settlements in your Razorpay Dashboard.

## 9. The list of online payments

Under **Money**, click **Online payments and refunds**. You see **Recent online payments**, newest first:

- **When**: the day it was paid.
- **Order**: the order number (click it to open the order). Under it, the state and how they paid, for example *Paid · UPI*.
- **Customer**: who paid.
- **Paid**: how much came in.
- **Returned**: how much has gone back. *₹… on its way* means Razorpay is still sending it. *+ ₹… at the counter* means some was given back in the shop instead, in cash or another way.

The state under the order number is one of three:

- **Paid**: a normal paid order. If the order was later cancelled, it also says *cancelled*.
- **Returned**: the money was sent back by itself (step 10). A grey line under the row says why.
- **Needs looking at**: something about the payment did not match, and ScaleEzy did not make an order from it. A red line under the row says exactly what. You also get an alert at the bell.

The list refreshes by itself every half minute while it is open, so a refund that Razorpay is still sending turns into *returned* on its own.

## 10. Money that goes back by itself

You do not need to do anything in these cases. ScaleEzy asks Razorpay to send the money back in full, and tells you at the bell (top right):

- You cancel a paid online order, or the customer cancels it from their order page. The whole amount goes back. (If part of the order was already sent and you press **Close rest of order**, nothing goes back by itself: you decide how much, with **Refund** in step 11.)
- A piece was sold before the payment arrived, for example someone bought the last piece at the counter while the customer was paying. No order is made.
- The customer paid twice for the same bag, for example in two tabs. One order is made; the second payment goes back.
- The payment arrived more than two days after the order was priced, or the amount paid does not match the order. No order is made.

The customer sees *Your money is going back*. It reaches them in 5–7 working days, to the same UPI, card or bank they paid from.

## 11. Give money back yourself

For a goodwill refund, a late delivery, or part of an order closed short:

1. Open **Settings → Money → Online payments and refunds**.
2. On the payment, click **Refund**. (Only people allowed to *take a return back at the counter and pay the money back* see this button.)
3. Type how much, in rupees, for example `500` or `499.50`. It cannot be more than is left on that payment. The box says the most you can give.
4. Type why. The customer does not see this; it is for your own records.
5. Press **Refund ₹…**.

The money goes back through Razorpay to however the customer paid, in 5–7 working days. A refund cannot be undone.

:::tip Taking the pieces back? Use Returns
A refund here gives money only. When the customer sends pieces back, use Returns instead: it puts the pieces back in stock and refunds through Razorpay in one go.
- At the counter: in [Take a return at the counter](/help/returns/take-a-return), for a bill paid online you can choose **Online**, and the money goes back through Razorpay. Nothing to hand over.
- A parcel return: in [Finish a return](/help/returns/finish-a-return), the last step offers **Online (Razorpay)** first for a bill paid online. Press **Refund ₹… through Razorpay**.
You can still choose cash, UPI or store credit instead, if the customer asks.
:::

## Change or remove your Razorpay account

Under the connected account (owner only):

- **Replace keys**: paste a new Key ID and Key Secret, for example after you generated new ones in Razorpay. They take over at once. The webhook address and secret stay the same, so there is nothing to change in Razorpay's webhook.
- **New webhook secret**: makes a new secret and shows it once. The old one stops working at once, so paste the new one into your webhook in Razorpay straight away (Account & Settings → Webhooks → your webhook → Edit).
- **Disconnect**: stops online payments and deletes your keys from ScaleEzy. Customers can still pay when the parcel arrives. Payments already taken stay in the list. Refunds for them must then be done in your Razorpay Dashboard.

**New webhook secret** and **Disconnect** ask first.

## Common problems

:::faq The Online box is greyed out in Settings → Online shop
Razorpay is not connected yet, the keys are not working, or they are TEST keys. Open **Settings → Razorpay account** and read the line at the top of the card (step 5).
:::

:::faq "Your Razorpay keys are not working"
The keys were changed or deleted in Razorpay. Generate new keys in Razorpay (in Live mode), then use **Replace keys** here. Until then, customers can still pay when the parcel arrives.
:::

:::faq "This Razorpay account is already connected to another shop on ScaleEzy"
Each shop needs its own Razorpay account. Use the Razorpay account that belongs to this shop.
:::

:::faq A customer paid, but the order does not say paid
Check the webhook in Razorpay (step 4): the address, the secret and the five ticked events. ScaleEzy also asks Razorpay by itself every minute, for two days, so the order catches up shortly. If the payment arrived but the order could not be made, it shows as **Returned** in the list and the money goes back by itself.
:::

:::faq The customer says they paid twice
Only one order is made. The second payment goes back to them by itself and shows as **Returned** in the list, with the reason.
:::

:::faq A payment says "Needs looking at"
Read the red line under it. ScaleEzy did not make an order from that payment. Usually the amount Razorpay took did not match the order; a payment that was only authorised and never taken lapses by itself in a few days. If money was taken, it is being returned, or the line tells you to refund it from your Razorpay Dashboard.
:::

:::faq "A refund did not go through"
The red line under the payment says why. The customer has not been refunded. Fix the cause in Razorpay, for example your Razorpay balance, then press **Refund** again.
:::

:::faq "No Razorpay account is connected any more"
The payment was taken by an account you have since disconnected or replaced. Refund it from the Razorpay Dashboard of the account that took it (the line shows its Key ID).
:::

:::faq "Only ₹… of this payment is left to refund"
Some of it already went back, through Razorpay or at the counter. You cannot give back more than was paid.
:::

:::faq I don't see Razorpay account in Settings
Only people who manage the online shop see it, and only the owner can connect an account.
:::

:::faq I don't see the Refund button
Your role does not allow giving money back. Ask the owner. The button also does not show when everything on that payment has already gone back.
:::
