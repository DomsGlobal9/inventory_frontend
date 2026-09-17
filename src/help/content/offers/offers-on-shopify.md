---
title: Offers on Shopify
summary: Put a copy of your offer on your Shopify store, so Shopify charges the same discount as your till.
for: Owners and admins
minutes: 3
app: /offers
appLabel: Offers
keywords: shopify discount sync mirror put on shopify push ours accept theirs changed in shopify take off online store
---

Your Shopify store charges its own discounts. To give Shopify customers the same offer, put a copy of the offer on Shopify from ScaleEzy. ScaleEzy then keeps checking that the two match.

- You need a Shopify store connected in **Settings → Storefront**. See [Connect Shopify](/help/settings/connect-shopify).
- Only the owner or an admin can put offers on Shopify.

## 1. Open the Shopify box

Open the offer and click [[1]] **Shopify** at the top. In the **Offers** list the same button is the small shop icon on the offer's row.

![The page for Festive 10% off silk with the Shopify button at the top marked 1.](1-shopify-button.webp "The button is there even before a Shopify store is connected.")

## 2. Read what it says

When no Shopify store is connected, the box says so [[1]]. Connect your store first.

![The box Festive 10% off silk on Shopify, saying No Shopify store is connected to this workspace. Connect one in Settings, Storefront, to put offers on it. The message is marked 1.](2-not-connected.webp "Nothing is sent to Shopify from this box until you press a button.")

When a store is connected, the box shows your Shopify store's address and one of these:

- **This offer can be put on your Shopify store** with a **Put on Shopify** button. Start the offer first: a draft is not put on Shopify.
- **This offer cannot go on Shopify as it is**, with the reasons. See below.
- The state of the copy that is already there.

## What the states mean

| State | Meaning | What to do |
|---|---|---|
| **Sending to Shopify** | Shopify is being updated. It takes up to a minute. | Wait. |
| **On Shopify** | Shopify charges the same as this offer. | Nothing. |
| **Changed in Shopify** | Someone changed the discount inside Shopify, so it no longer matches. | **Push ours** puts your version back. **Accept theirs** takes the Shopify version into ScaleEzy. |
| **Not on Shopify** | Sending failed, or the discount was deleted in Shopify. The reason is shown. | **Retry** or **Push ours**. |
| **Cannot go on Shopify** | Shopify has no way to run this kind of offer. | Change the offer, see below. |
| **Taking off Shopify** | The discount is being removed from Shopify. | Wait. |

**Take off Shopify** removes the copy from Shopify. The offer keeps running at your till.

:::tip Change offers in ScaleEzy, not in Shopify
When you edit, pause or retire an offer here, its Shopify copy follows. Changes made inside Shopify show as **Changed in Shopify**.
:::

## Offers Shopify cannot copy

Shopify discounts are simpler than ScaleEzy offers. The box lists the exact reason. The common ones:

- **Set a price** offers. Only a percentage or an amount off can go on Shopify.
- A percentage with a **Never more than** cap.
- Offers on **Types of garment** or **Departments**. Choose the products instead.
- **Leave some things out**, **Some groups** of customers, or **Only at certain hours**.
- **Single-use codes**. Use one shared code instead.
- A **Total uses** limit, or a **Uses per customer** limit (the only exception is a code offer that each customer can use once).
- Both a minimum spend and a minimum number of items.
- Offers for the **Till** only, or retired offers.
- Products that are not matched to your Shopify store by SKU.

## Common problems

:::faq I don't see Put on Shopify
Check that the offer is started (not a draft), that the box does not say it cannot go on Shopify, and that your role may put offers on Shopify.
:::

:::faq "Your Shopify store has not given this app permission to manage discounts."
Reconnect your store in **Settings → Storefront** and approve discounts when Shopify asks.
:::

:::faq It says Changed in Shopify
Someone edited or paused the discount inside Shopify. Press **Push ours** to put your ScaleEzy version back, or **Accept theirs** to keep Shopify's.
:::
