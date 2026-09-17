---
title: Use a barcode scanner
summary: Which scanner works, how to test it, and every screen where you can scan instead of typing.
for: Everyone
minutes: 3
app: /orders/new-sale
appLabel: New sale
keywords: barcode scanner scan gun usb bluetooth qr code label tag reader not working enter hardware camera phone scanning sku
---

A barcode scanner saves typing. Point it at a price tag or a shelf label, and the code appears in the box on your screen as if you typed it.

## Which scanner works

- A **USB** or **Bluetooth** scanner that **types like a keyboard**. Most shop scanners work this way. No app or driver is needed.
- It must press **Enter** at the end of each scan. Most scanners do this already.
- Price tags have an ordinary line barcode. **Shelf labels have a QR code**, so if you use shelves, buy a scanner that reads QR codes too (often called a *2D* scanner).

:::note No phone camera scanning
ScaleEzy cannot scan with a phone or tablet camera. Use a scanner, or type the code.
:::

## 1. Test your scanner

1. Plug in the scanner, or pair it by Bluetooth like a keyboard.
2. Open **Notepad** (or any place you can type).
3. Scan a price tag.

The number should appear and the cursor should jump to the next line. That jump is the **Enter**. If the number appears but the cursor stays on the same line, the scanner is not sending Enter. Set it up with the setup barcodes in the scanner's own booklet.

## 2. Click in the box, then scan

The scanner types wherever the cursor is. So the box must be **active** first: click in it. On **New sale** and on the **Shelves** screens the cursor is already in the box when the screen opens.

![New sale. The box Scan a barcode, or type a name, SKU or colour is marked 1.](1-new-sale.webp "Each scan adds the item to the bill.")

## Where you can scan

| Screen | Box | What a scan does |
|---|---|---|
| **Top of every screen** | **Search products, SKU, barcode...** | Opens that item. Not shown on a phone. |
| **New sale** | **Scan a barcode, or type a name, SKU or colour** | Adds the item to the bill. If several items match, pick one from the list. |
| **Stock count** (while counting) | **Scan barcode or search SKU...** | Finds the item and puts the cursor in its count box. Type how many you counted. |
| **Shelves → Where is it?** | **Scan a tag or shelf label, or type saree, SKU, colour…** | A price tag shows where that item is. A shelf label shows what is on that shelf. |
| **Shelves → Put away** | **Scan the tag or filter…**, then **Scan the shelf label — it saves straight away** | Scan the item, then the shelf. It saves at once. |
| **Shelves → Move** | **Scan the shelf label the pieces are on**, then **Scan the shelf label — it moves straight away** | Scan the shelf, click the item, then scan the new shelf. |
| **Shelves → Pick** | **Scan the item** | Each scan picks one piece. |
| **Shelves → Count** | **Scan the shelf label**, then **Scan a tag — each scan counts one** | Scan the shelf, then every piece on it. Press **Save count** at the end. |

The picture below shows the search at the top of the screen, on a computer.

![The Dashboard. The search box at the top, Search products, SKU, barcode..., is marked 1.](2-top-search.webp "Nothing found shows a message and keeps the code in the box.")

:::warning Two boxes that do not use Enter
- The search on the **Inventory** screen only filters the list. Clear the box before the next scan, or the two codes join together.
- **Add Item to PO** in a purchase order finds the item, but you still click it in the list.
:::

## Where barcodes come from

- **Price tags**: ScaleEzy makes a barcode for every size and colour. Print the labels from the product's **Variants** tab. See [Sizes, colours and barcodes](/help/products/variants-and-barcodes).
- **Shelf labels**: print them in **Shelves → Racks & shelves**. See [Set up racks and print labels](/help/shelves/set-up-racks).

## Common problems

:::faq I scan and nothing happens
Click in the box first, then scan again. The scanner types where the cursor is. If you are in the **Inventory** search or **Add Item to PO**, that is normal: those boxes do not act on Enter.
:::

:::faq The code appears but nothing is found or added
The scanner may not be sending **Enter**. Test it in Notepad (step 1). If the code has joined onto an old one, clear the box and scan again.
:::

:::faq New sale says "Nothing here matches", "None here" or "Not sold here"
- **Nothing here matches**: no item in your shop has this code, or the product is archived. Check the tag.
- **None here**: the item has no free pieces in the store chosen at the top of the screen. Check the store name. See [Working with more than one store](/help/start/more-than-one-store).
- **Not sold here**: the item is switched off for this store. See [A different price in one store](/help/products/price-per-store).
:::

:::faq A shelf label says it is in another location
That shelf belongs to a different store. Switch to that store at the top of the screen, or use a [transfer](/help/transfers/transfers) to move the stock.
:::

:::faq The scanner reads price tags but not shelf labels
Shelf labels use a QR code. Your scanner reads only line barcodes. Use a scanner that reads QR codes, or type the shelf address instead, for example *FLOOR-C1-1*.
:::
