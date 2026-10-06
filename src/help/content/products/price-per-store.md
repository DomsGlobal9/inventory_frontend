---
title: A different price in one store
summary: Give one size or colour its own price in one store, or stop selling it there. Other stores keep the normal price.
for: Owners, admins and inventory managers
minutes: 2
app: /products
appLabel: Products
keywords: price store location override different price branch godown available not sold here counter till
---

Usually an item has one price everywhere. With **Location Settings** you can give one variant (one size or colour) a different price in one store. You can also switch it off in one store.

## 1. Open the product

1. In the menu, click [[1]] **Products** and click the product.
2. Click the [[2]] **Variants** tab.

![The product page for Kanchipuram Silk Saree. Products is marked 1 in the menu and the Variants tab 2.](1-open.webp "Each row on the Variants tab is one size or colour.")

## 2. Open Location Settings

On the row of the variant, click [[1]] the **Location Settings** button (the gear).

![The Variants tab. The Location Settings button on the red saree row is marked 1.](2-location-settings.webp "The gear is between the truck and the red bin.")

## 3. Type the store price and save

Every store and godown has its own box.

1. [[1]] Find the store, for example **Main Store**.
2. [[2]] Type the price for that store in **Price Override (₹)**. Leave it empty to use the normal price. The grey *Global Price* text means it is empty.
3. Click [[3]] **Save** in the same box. Each store has its own Save button.
4. [[4]] **Available**: untick it only if this variant must **not** be sold in this store. Then click **Save**.

![Location Settings for SAR-KAN-RED. Main Store is marked 1, the price 8200 is marked 2, Save 3 and the Available tick box 4.](3-set-the-price.webp "The Godown box below is left empty, so the Godown keeps the normal price.")

The message *Location settings updated* shows at the bottom of the screen. Close the window with the **✕** at the top right.

## 4. Check it

When the store with its own price is chosen at the top of the screen, the Variants tab shows it under **You sell at**. [[1]] For example *Main Store sells at ₹8200.00*.

![The You sell at column of the red saree. The line Main Store sells at 8200 is marked 1.](4-shown-in-the-table.webp "The box above it still shows the normal price, 8500.")

## 5. What the till uses

The ScaleEzy POS till gets its prices from Inventory, store by store. After changing a store price, press **Refresh items from Inventory** on that store's till. The item then bills at the store price there; in other stores the same item keeps the normal price.

ScaleEzy picks the price in this order:

1. The store price from **Location Settings**, if there is one for that store.
2. Otherwise the variant's own price in **You sell at** on the Variants tab.
3. Otherwise the product's base price.

Online, a running offer then takes its discount off that price.

:::note Not available in a store
When **Available** is unticked, orders for it from that store are refused. The Variants tab shows *Not sold at* and the store name.
:::

## Common problems

:::faq The counter still shows the old price
The store price only applies in the store the till sells from. Check that you pressed **Save** in the box of the right store, then press **Refresh items from Inventory** on the till.
:::

:::faq I want the normal price back
Open **Location Settings**, empty the **Price Override (₹)** box of that store and press **Save**.
:::

:::faq An item cannot be sold in one store
**Available** is unticked for this store. Open **Location Settings**, tick **Available** and press **Save**.
:::

:::faq Saving fails with a permission message
Only the owner, an admin or an inventory manager can change prices. Ask your shop owner.
:::
