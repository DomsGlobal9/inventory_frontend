---
title: Move stock between stores
summary: Send pieces from one store to another, for example from the shop to the godown, in one step.
for: Owners, managers and stock room staff
minutes: 3
app: /inventory/transfers
appLabel: Transfers
keywords: transfer move stock between stores godown warehouse branch send shift location origin destination
---

## 1. Open Transfers

In the menu on the left, click [[1]] **Transfers**.

![The Stock Transfer screen. Transfers is marked 1 in the left menu.](1-open.webp "You only see Transfers if your role may move stock.")

## 2. Choose where from and where to

1. [[1]] **Origin Location**: the store the pieces leave, for example **Main Store**.
2. [[2]] **Destination Location**: the store they go to, for example **Godown**.
3. Write **Transfer Notes** if you like.
4. Click [[3]] **Add Item**.

![The transfer form. Origin Location Main Store is marked 1, Destination Location Godown 2 and Add Item 3.](2-from-and-to.webp "Add Item works only after you choose the Origin Location.")

## 3. Choose the item and how many

1. [[1]] Pick the item. Only items with stock in the origin store are listed, with how many are available.
2. [[2]] Type how many pieces to move. It cannot be more than **Max**.
3. [[3]] **Taken from which shelf?** If the origin store uses shelves, choose the shelf the pieces come off. Or leave **Let the app decide**: it takes pieces that are not on a shelf first.

![One item added. The Kanchipuram Silk Saree item is marked 1, the quantity 2 and the shelf STORE-R1-1 is marked 3.](3-add-item.webp "Press Add Item again to move more items in the same transfer.")

Click the red bin to remove a line you added by mistake.

## 4. Press Confirm Transfer

Check both stores and the quantities, then click [[1]] **Confirm Transfer**.

![The whole transfer form. Confirm Transfer at the bottom is marked 1.](4-confirm.webp "The stock moves straight away.")

You see this message:

![The message: Stock transferred. At the destination it waits in Shelves, Put away.](5-done.webp "The form empties, ready for the next transfer.")

The pieces leave the origin store and arrive at the destination at once. Both stores' stock and [Stock history](/help/inventory/stock-history) show the move.

## 5. Put the pieces away at the other store

At the destination the pieces are *Not shelved*. Someone there changes the store at the top of the screen to that store, then follows [Put away stock](/help/shelves/put-away).

## Who can do this

Owners, admins, managers and stock room staff.

## Common problems

:::faq "No stock available at this location to transfer"
The origin store has no pieces of anything. Check you chose the right **Origin Location**.
:::

:::faq "Only 2 available for that item at the origin location"
You typed more than the origin store has. Lower the quantity to the **Max** number or less.
:::

:::faq "Only 2 of this item are free here: 3 are held for orders"
Some pieces are held for confirmed orders at the origin store. Send or cancel those orders first, or move fewer pieces.
:::

:::faq I cannot find a list of past transfers
The Transfers screen has no list. Open [Stock history](/help/inventory/stock-history): each transfer shows as an OUT at one store and an IN at the other.
:::
