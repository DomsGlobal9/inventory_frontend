---
title: Move stock between stores
summary: Send pieces from one store to another, for example from the shop to the godown, from the Move stock box on Inventory. Add a new store or godown from the same box.
for: Owners, managers and stock room staff
minutes: 3
app: /inventory?transfer=1
appLabel: Inventory
keywords: transfer transfers move stock between stores godown warehouse branch send shift location from to origin destination add location new store new godown move stock
---

Moving stock is done from **Inventory**, in the **Move stock** box. (It used to be its own Transfers page; an old link or bookmark to it opens this box.)

## 1. Open Move stock

In **Inventory**, click [[1]] **Move stock**. To move one item, you can also click the move button (two arrows) on its row: the box opens with that item already in it.

![The Inventory page, with Move stock marked 1 at the top right.](1-open.webp "You only see Move stock if your role may move stock.")

## 2. Choose where from and where to

1. [[1]] **From**: the store the pieces leave. It starts as the store chosen at the top of the screen.
2. [[2]] **To**: the store they go to, for example **Godown**.
3. [[3]] Scan an item's barcode, or type its code or name. Only items with stock at the **From** store are found, with how many are there. Press **Enter** or click it to add it.

![The Move stock box. From, Main Store, is marked 1, To, Godown, 2, and the box to scan or type an item 3.](2-from-and-to.webp "Add as many items as you like to the same move.")

## 3. How many, and from which shelf

1. [[1]] The item, with how many are at the **From** store.
2. [[2]] Type how many pieces to move. It cannot be more than are there.
3. [[3]] **Taken from which shelf?** If the store uses shelves, choose the shelf the pieces come off. Or leave **Let the app decide**: it takes pieces that are not on a shelf first.

![One item added: the Kanchipuram Silk Saree marked 1, the quantity 2 marked 2 and the shelf STORE-R1-1 marked 3.](3-add-item.webp "The red bin removes a line you added by mistake.")

You can write a **note** if you like, for example what the stock is for.

## 4. Press Move

Check both stores and the quantities, then click [[1]] **Move 2 pieces** (the button counts them).

![The whole box, with the Move 2 pieces button marked 1.](4-confirm.webp "The stock moves straight away.")

You see this message:

![The message: 2 pieces moved. At Godown they wait in Shelves, Put away.](5-done.webp "The box closes, and Inventory shows the new numbers.")

The pieces leave one store and arrive at the other at once. Both stores' stock and [Stock history](/help/inventory/stock-history) show the move.

## 5. A store that is not in the list yet

Opening a new godown or a second shop? Choose **+ Add a new location** at the end of the **To** list. A small form opens inside the box:

![The New location form: Name marked 1, Type 2, Code 3 and Add location 4.](6-new-location.webp "Address and phone can be added later in Settings, Locations.")

1. [[1]] The **name**, as people call it.
2. [[2]] The **type**: a store, a godown or warehouse, or online.
3. [[3]] A short **code**. It fills itself in from the name; change it if you like. No two locations can share a code.
4. Click [[4]] **Add location**. It is saved to **Settings → Locations** and chosen as **To** straight away.

You only see **+ Add a new location** if your role may manage locations.

## 6. Put the pieces away at the other store

At the destination the pieces are *Not shelved*. Someone there changes the store at the top of the screen to that store, then follows [Put away stock](/help/shelves/put-away).

## Who can do this

Owners, admins, managers and stock room staff. Adding a new location from the box is for those who may manage locations (owners, admins and managers).

## Common problems

:::faq Nothing with stock matches what I type
Only items with stock at the **From** store are found. Check you chose the right **From** store, and try a shorter part of the code or name.
:::

:::faq "Only 2 of SAR-KAN-RED are at Main Store"
You typed more than the **From** store has. Lower the number to what is there or less.
:::

:::faq "Only 2 of this item are free here: 3 are held for orders"
Some pieces are held for confirmed orders at the **From** store. Send or cancel those orders first, or move fewer pieces.
:::

:::faq "Another store already uses the code"
Each location needs its own code. Change the **Code** in the new location form, for example add a number.
:::

:::faq Where did Transfers go?
It is the **Move stock** box on **Inventory** now. A list of past moves is in [Stock history](/help/inventory/stock-history): each move shows as an OUT at one store and an IN at the other.
:::
