---
title: Add a product
summary: Add a new saree, kurti or any other item in three short steps, then publish it or keep it as a draft.
for: Owners, admins and inventory managers
minutes: 4
app: /products
appLabel: Products
keywords: new product add item create saree kurti price size colour color stock photo publish draft wizard
---

Adding a product has three steps: **General Information**, **Measurements** (price, sizes, colours and stock) and **Upload Photos**. Then you check everything on one page and publish.

## 1. Open Add Product

1. In the menu on the left, click [[1]] **Products**.
2. At the top right, click [[2]] **Add Product**.

![The Products screen. Products is marked 1 in the left menu and the Add Product button is marked 2.](1-open.webp "You can also start from + Product on the Dashboard.")

## 2. Fill in the general information

1. [[1]] Type the **Product Name**, for example *Pochampally Ikat Saree*.
2. [[2]] Choose the **Product Category**, for example WOMEN.
3. [[3]] Choose the **Dress Type**, for example Saree. The list changes with the category.
4. Design / Craft, Material / Fabric, Description, Product Type and Brand are optional. Fill them in if you want them on your website.
5. Click [[4]] **CONTINUE**.

![General Information. The name box is marked 1, the category 2, the dress type 3 and the CONTINUE button 4.](2-general-information.webp "Only the name and the category are needed to go on.")

:::tip A category or dress type is missing?
The lists come from **Settings → Catalog Configuration**. See [Catalog settings](/help/settings/catalog-settings).
:::

## 3. Set the price, sizes, colours and stock

1. [[1]] **You sell at (₹)**: the price for your customers.
2. [[2]] **You pay (₹)**: what the item cost you. It is optional, but ScaleEzy uses it for your profit and your stock value.
3. [[3]] **Available Sizes**: click each size you sell. A saree is always **Free Size**.
4. [[4]] **Select Colors**: **double-click** a colour circle to add it. Or click it once, then click one of its shades. Each colour you add shows as a small chip. Click the **✕** on a chip to remove it.
5. [[5]] In the **Inventory Units Matrix**, type how many pieces you have of each colour and size. Leave 0 if you have none yet.

![Measurements. You sell at is marked 1, You pay 2, the Free Size box 3, the colours 4 and the stock grid 5.](3-price-colours-stock.webp "Red and Blue are chosen, with 3 red and 2 blue pieces.")

The **Supplier** box is optional. Choose the supplier you buy this item from, so you can reorder it later without typing again.

When one size or colour has its own price, tick **Different price per size or colour** above the grid and type the price in each box.

## 4. Go to the photos

Click [[1]] **CONTINUE TO UPLOAD**.

![The CONTINUE TO UPLOAD button, marked 1.](3b-continue.webp)

## 5. Add a photo

Click [[1]] **UPLOAD** and choose a photo of the item from your computer or phone. On a phone or tablet you can also press **CAMERA**.

![Upload Photo for a saree. The UPLOAD button in the Saree box is marked 1.](4-photos.webp "For a saree the Saree photo is the main one. The Blouse photo is optional.")

## 6. Go to the review page

The photo appears with **Ready**. Click [[1]] **REVIEW & PUBLISH PRODUCT**.

![The saree photo is added and shows Ready. REVIEW & PUBLISH PRODUCT is marked 1.](4b-photo-added.webp "The red cross removes the photo if you chose the wrong one.")

:::note What you see here depends on the dress type
For sarees, lehengas, anarkalis, shararas and kurtis you get named photo boxes. For other items you get one **Add Photos** box where you can add many photos at once.

The **GENERATE 4-VIEW CATALOG** button is optional. It makes model photos from your photo with an AI service. You do not need it to publish.
:::

## 7. Check where the stock goes

Look at the product details, the photo and the **INVENTORY SUMMARY**.

[[1]] The stock you typed goes into the store chosen at the top of the screen. Tick the box *Stock these units at Main Store only* off to put the same number of pieces in **every** location instead.

![The Inventory Summary. The line Stock these units at Main Store only is marked 1.](5-inventory-summary.webp "Worth at selling price, what it cost you and your profit if it all sells.")

## 8. Publish, or save as a draft

1. On the right, the [[1]] **PUBLISHING CHECKLIST** must be all ticked to publish: name and category, sizes, colours, a price and at least one photo.
2. Click [[2]] **PUBLISH PRODUCT** to put it on sale now. Or click [[3]] **SAVE AS DRAFT** to finish it later.

![The Publishing Checklist with all five items ticked, marked 1. PUBLISH PRODUCT is marked 2 and SAVE AS DRAFT 3.](6-checklist.webp "READY TO PUBLISH shows when every item is ticked.")

Saving takes a few seconds while ScaleEzy adds each colour and size and uploads the photos. Wait until you see the Products list again.

## 9. Find it in your list

You are back on **Products**. [[1]] Your new product is at the top, with its product code, the number of variants (colour and size combinations), the stock and the price.

![The Products list with Pochampally Ikat Saree at the top, marked 1, status ACTIVE.](7-in-the-list.webp "Product published shows at the bottom right.")

:::note Each colour and size gets its own code
ScaleEzy makes a separate item, called a variant, for each colour and size, with its own SKU and barcode. See [Sizes, colours and barcodes](/help/products/variants-and-barcodes).
:::

## Common problems

:::faq "Give the product a name before continuing."
The **Product Name** box is empty. Type a name, then press **CONTINUE**. If it says *Choose a product category before continuing.*, choose a category.
:::

:::faq "Select at least one size" or "Select at least one colour"
On the second step, click at least one size and **double-click** at least one colour. One single click only opens the shades of that colour.
:::

:::faq PUBLISH PRODUCT is grey
One item on the **PUBLISHING CHECKLIST** is not ticked. Most often it is the photo. Press **BACK TO EDIT** to add it, or press **SAVE AS DRAFT** and add the photo later from the product page.
:::

:::faq The stock shows in red right after I added it
New variants warn at 5 pieces or fewer. With only a few pieces, the number shows red as low stock. It is only a warning.
:::

:::faq Can I change a product's name or price after saving?
The name and the Base Price, no. No screen changes a product's **name**, **Base Price**, **category** or **description** after it is saved, and importing a sheet with its product code does not change them either. Check them on the review page before you publish.

You can still change these:

- The selling price of each colour and size (**You sell at**) and what you pay (**You pay**), on the **Variants** tab. See [Sizes, colours and barcodes](/help/products/variants-and-barcodes).
- A different price in one store. See [A different price in one store](/help/products/price-per-store).
- Photos. See [Product photos](/help/products/photos).
- Draft, published, archived or trash. See [Publish, archive and delete](/help/products/publish-archive-delete).
- New sizes and colours, with **Generate Variants** on the **Variants** tab.
- The reorder level, with a file. See [Change stock or reorder levels in bulk](/help/products/bulk-updates).
:::

:::faq Saving fails with a permission message
Only the owner, an admin or an inventory manager can add products. Other roles can open the screen, but the product is not saved. Ask your shop owner to add it, or to change your role.
:::
