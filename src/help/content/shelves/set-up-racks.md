---
title: Set up racks and print labels
summary: Describe your racks, cupboards and shelves once, from a ready layout or a spreadsheet, then print a label for every shelf.
for: Owners, admins and inventory managers
minutes: 5
app: /shelves/setup
appLabel: Racks & shelves
keywords: setup racks shelves cupboard almirah rail godown layout preset quick create import csv spreadsheet labels print qr sticker thermal shop floor back room walking order
---

Only the owner, an admin or an inventory manager can set up racks. Stock room and sales staff do not see the **Racks & shelves** tab.

Each store or godown has its own racks. Check the store at the top of the screen before you start.

## 1. Open Racks & shelves

1. In the menu on the left, click [[1]] **Shelves**.
2. Click the [[2]] **Racks & shelves** tab.

A store with nothing set up yet shows three ways to start: [[3]] **Describe this place** (three plain questions, and ScaleEzy draws your racks), **Set it up myself** (a ready layout you adjust) or [[4]] **Import from a spreadsheet**. **Describe this place** is the easiest, and it is the only one that lets each rack have its own number of shelves.

![Racks and shelves for Anna Nagar Branch with no racks yet. Shelves in the menu is marked 1, the Racks and shelves tab 2, Describe this place 3 and Import from a spreadsheet 4.](1-open.webp "The store name at the top right shows which store you are setting up.")

## 2. Choose a ready layout

Click **Set it up myself**. Under **Start from**, click [[1]] the layout most like your shop:

- **Saree boutique**: wall cupboards with shelves on the shop floor
- **Readymade**: hanging rails split by size
- **Display counter**: a glass counter with drawers
- **Back room / godown**: numbered racks with shelves
- **Godown with cartons**: racks, shelves and a box on each shelf

Then change the [[2]] **Levels** to match your shop. Each level has a kind (Area, Cupboard, Shelf, Box and so on) and its codes: **Numbered** (1 to 4, with a prefix like C), **Lettered** (A to D) or **Named** (FLOOR, GODOWN). Tick **01, 02…** to pad numbers so they sort properly. **Add a level inside** adds a deeper level, up to four.

![Quick create. The Saree boutique layout is marked 1 and the first level, an Area named FLOOR, is marked 2.](2-choose-a-layout.webp "Every layout can be changed before and after you create it.")

## 3. Shop floor or back room, then Create

1. [[1]] Choose **On the shop floor** or **In the back room**. Counter sales take stock from shop floor shelves first.
2. [[2]] Check the addresses in the preview. Nothing is saved yet.
3. Press [[3]] **Create**. The number on the button is how many spots will be made.

![The bottom of Quick create. On the shop floor is marked 1, the preview of 21 new spots 2 and the Create 21 button 3.](3-check-and-create.webp "If an address already exists it is counted as already there, not made twice.")

:::tip A godown in another building
Make it a separate store in **Settings → Stock Locations** and move stock with a transfer. A store room in the same building is just a **back room** area in the same store.
:::

## 4. Change anything later

Your racks now show as a tree on the left. Click [[1]] any area, rack or shelf to change it:

- **Code** and **Name (optional)**. The code is part of the address. The name, like *Silk sarees*, is just for you.
- [[2]] The up and down arrows set the **walking order**: the order people walk past the racks. Pick lists and counter sales follow it.
- [[3]] **Mark as back room** (or **Mark as shop floor**) changes a whole area at once.
- **Colour tag**, **Holds about (pieces)** and **Temporary (a table or stand for a sale)**.
- **Add inside** adds a shelf or box under it. **Quick create several inside** makes many at once.
- **Switch off** hides a spot. **Remove** deletes it. Both only work when nothing is on it.

Press **Save** after changing the code, name, kind, colour or capacity.

![The rack tree with the FLOOR area chosen. FLOOR in the tree is marked 1, the Later in the walk arrow 2 and Mark as back room 3.](4-the-tree.webp "A shelf that holds pieces cannot get boxes inside it until you move the pieces off.")

:::note Changing an address
Printed labels keep working after you change a code, because the QR code holds a fixed label number. The address printed on the label will look out of date, so reprint it when you can.
:::

## 5. Or import from a spreadsheet

For a big godown, or a layout you already have written down:

1. Click **Import from a spreadsheet** (or the **CSV** button above the tree).
2. Click [[1]] **Template** to download an example sheet.
3. Fill one row per shelf or box. Only **address** is needed. You can add **name**, **kind**, **colour**, **capacity** and **shop_floor** (yes or no).
4. Click **Choose a CSV file**, or paste the rows into [[2]] the box.
5. Check [[3]] the preview. Racks and areas above each address are made for you.
6. Press [[4]] **Import**.

![Import addresses. Template is marked 1, three pasted rows 2, the preview of 6 new spots 3 and the Import 6 button 4.](5-import-from-a-sheet.webp "Rows keep their order as the walking order.")

If a row has a problem, the preview says which row and why, and **Import** stays switched off until you fix it.

## 6. Print the labels

At the top of **Racks & shelves**, click [[1]] **Print all labels**. To print only one rack, choose it in the tree and click **Labels**.

![The Print all labels button at the top right of Racks and shelves is marked 1.](6-print-all-labels.webp "The labels page opens in a new browser tab.")

On the labels page:

1. [[1]] Choose the paper: **A4 sticker sheet (3 × 8)** for an ordinary printer, or **Label printer (50 × 25 mm)**.
2. [[2]] Keep **Only shelves that hold stock** ticked to skip racks and areas, which usually do not need a label.
3. Press [[3]] **Print** and use your browser's print window.

![The labels page on A4 sticker sheet. The paper size is marked 1, Only shelves that hold stock 2 and Print 3. Each label has a QR code, the address and the store name.](7-labels-a4.webp "Stick each label on the front edge of its shelf.")

![The same labels set to Label printer (50 × 25 mm), one label under another.](8-labels-label-printer.webp "One label per page, for a label printer.")

:::tip Test one label first
Print one page, stick a label on a shelf and scan it in [Where is it?](/help/shelves/where-is-it). You should see that shelf straight away.
:::

## Shelf history

Want to know what happened on one shelf? In **Racks & shelves**, click the shelf in the tree, then click **History** at the bottom of its details. The list opens under it and shows:

- every time the **address changed**, from the old address to the new one
- every **movement** on that shelf: the date and time, the item, what happened (for example *sold*, *stock count* or a shelf move) and how many pieces came on (**+**) or went off (**−**)

It shows the newest first: the last 100 movements and the last 50 address changes. A shelf with nothing yet says **Nothing yet.**

Like the rest of **Racks & shelves**, only the owner, an admin or an inventory manager can open it. Shelf moves are not in the stock ledger, because they do not change how much you have. See [Stock history](/help/inventory/stock-history).

## Common problems

:::faq I don't see Racks & shelves
Only the owner, an admin or an inventory manager can set up racks. Ask one of them, or ask for the permission in **Settings → Roles & Permissions**.
:::

:::faq Remove or Switch off does not work
A spot can only be removed or switched off when it, and everything inside it, is empty. Move the pieces to another shelf first with [Move between shelves](/help/shelves/move).
:::

:::faq I cannot add boxes inside a shelf
The shelf has pieces on it. Stock can only sit on the last level, so move the pieces off first, add the boxes, then put the pieces into a box.
:::

:::faq The racks are for the wrong store
Racks belong to the store chosen at the top of the screen. Switch to the right store and set them up there. Empty racks in the wrong store can be removed.
:::
