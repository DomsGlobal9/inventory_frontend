---
title: Connect Shopify
summary: Link your Shopify store to ScaleEzy, so Shopify sales arrive here as orders and take stock from the right store.
for: Owners, admins and inventory managers
minutes: 4
app: /settings
appLabel: Settings
keywords: shopify connect link online store website myshopify orders sync waiting orders privacy pair locations match products sku claim store
---

When Shopify is connected, **every Shopify sale arrives in ScaleEzy as an order**. For that to work, ScaleEzy must know which of your stores each Shopify location is, and which of your products each Shopify product is. This page shows how.

Only people who can **Add and change shops and warehouses** see **Storefront**. In the ready roles: the owner, **ADMIN** and **INVENTORY_MANAGER**.

## 1. Open Storefront

1. Open **Settings** and click [[1]] **Storefront**.
2. [[2]] The **Shopify** card is at the top.

![The Storefront screen. Storefront is marked 1 in the Settings list and the Shopify card is marked 2.](1-open.webp "Your own website, if you have one, is connected lower on the same screen.")

## 2. Type your store address and connect

1. [[1]] Type your Shopify store address. It ends in **.myshopify.com**. You find it in Shopify under Settings.
2. Press [[2]] **Connect Shopify**.

![The Shopify card with lakshmisilks-demo.myshopify.com typed in the box, marked 1. Connect Shopify is marked 2.](2-store-address.webp "Type the myshopify.com address, not your own web address.")

## 3. Approve on Shopify

1. ScaleEzy opens Shopify. Sign in to Shopify if it asks.
2. Shopify lists what ScaleEzy may read and change. Approve it.
3. Shopify brings you back to **Settings → Storefront**. A message says your store **is connected**.

The Shopify card now shows your store address and **CONNECTED**.

:::warning Approve everything Shopify asks for
If some permissions were not approved, a yellow message on the card names them. Those updates will not reach your store. The connected card has no button to connect again, so raise a ticket in [Help & Support](/help/settings/get-support).
:::

:::note Installed the app from the Shopify side?
Then the card shows **Installed from Shopify, waiting to be claimed** with the store address. Check that the address is your store, then press **This is my store**. Never claim a store you do not recognise.
:::

## 4. After connecting: the four parts

Under your connected store you see four parts. Click a heading to open or close it.

### Locations: pair them first

Each Shopify location must be paired with one of your ScaleEzy locations.

1. Open **Locations**. ScaleEzy reads your Shopify locations.
2. Next to each Shopify location, choose your matching store. **Not paired** means no store yet.
3. It saves as soon as you choose. One ScaleEzy location can be paired with only one Shopify location.

A Shopify sale takes stock from the store it is paired with. The heading shows, for example, *2 of 2 paired*. Press **Refresh from Shopify** after you add a location in Shopify.

### Products: match by SKU

1. Open **Products** and press **Match products by SKU**.
2. ScaleEzy matches each Shopify product to yours with the same SKU. Spaces and capital letters do not matter.
3. It shows how many are **In Shopify**, **Newly matched**, **Already matched** and **No SKU in Shopify**.

Nothing in your Shopify store is changed. Products that **exist only in Shopify** are listed: add them in ScaleEzy with the same SKU, then match again.

### Waiting orders

A Shopify sale that ScaleEzy could not place waits here. The heading shows how many are waiting. Each order shows why, for example:

| Reason | What to do |
|---|---|
| **Location not paired** | Pair your locations, then press **Retry**. |
| **Product not recognised** | Match your products by SKU, then press **Retry**. |
| **Different currency** | It is never converted. **Dismiss** it if it should not be here. |
| **Totals do not agree** | Check the order in Shopify, then **Retry** or **Dismiss**. |
| **Could not be placed** | Press **Retry**. If it keeps failing, contact support with the order number. |

- **Retry** tries one order again. **Retry all** tries every waiting order.
- **Dismiss** removes an order you do not want placed. You must type why, then press **Dismiss order**.
- The **Settled** tab lists orders that were placed or dismissed.

When nothing is waiting, the heading says *None — every Shopify sale has been placed*.

### Privacy requests

This part appears only when a Shopify customer has asked about their data.

- **Customer asked for their data**: press **Save what we hold** and send the file to the customer.
- **Customer asked to be erased**: ScaleEzy does this by itself.

Only someone who can see customers can save the file.

## What stays in step, and what does not

The connection mostly works in one direction: from Shopify to ScaleEzy.

| What | Does it move? |
|---|---|
| Shopify sales | **Yes.** Each one comes into ScaleEzy as an order and takes stock from the paired store. |
| Your stock numbers | **No.** ScaleEzy does not send stock levels to Shopify. Keep them right in Shopify yourself. |
| New products and changes to products | **No.** ScaleEzy does not add or change products on Shopify. Add them in Shopify too, with the same SKU, then match again. |
| Offers | **Yes, if you choose.** An offer made in ScaleEzy can be put on your Shopify store. See [Offers on Shopify](/help/offers/offers-on-shopify). |

## Common problems

:::faq "That does not look like a Shopify store address"
The address must end in **.myshopify.com**, for example *yourshop.myshopify.com*. Your own web address, such as *yourshop.in*, does not work here.
:::

:::faq A Shopify sale did not arrive as an order
Open **Waiting orders**. The reason is written on the order. Fix it (usually pair a location or match products), then press **Retry**.
:::

:::faq The card says NEEDS RECONNECTING
The link with Shopify stopped working. The card has no button to connect again. Raise a ticket in [Help & Support](/help/settings/get-support) and give your store address.
:::

:::faq I don't see Storefront in Settings
Your role cannot change shops and warehouses. Ask your shop owner.
:::
