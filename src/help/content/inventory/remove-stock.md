---
title: Remove stock (damage, sample, return to supplier)
summary: Take pieces out of stock by hand when they are damaged, given as a sample or sent back to the supplier.
for: Owners and managers
minutes: 2
app: /inventory
appLabel: Inventory
keywords: issue stock out deduct damage damaged sample return to vendor supplier write off minus reduce shelf
---

:::note Sales take stock off by themselves
You do not need this for sales. A counter sale or a sent order takes the pieces off on its own.
:::

## 1. Find the item and press −

In **Inventory**, click [[1]] **−** (Issue Stock) on the item's line.

![The Inventory screen. The − button on the Kanchipuram Silk Saree line is marked 1.](1-open.webp "Stock is taken from the store chosen at the top of the screen.")

## 2. Fill in the form

1. [[1]] **Quantity to Deduct**: how many pieces. You cannot take more than the store has (the **Max** number).
2. [[2]] **Reason**: **DAMAGE**, **SAMPLE** or **RETURN TO VENDOR** (back to the supplier). Nothing is chosen for you: pick one, or the form asks you to. There is no Sale here, because sales take stock off by themselves.
3. [[3]] **Taken from which shelf?** Choose the shelf the pieces really came off.
4. Add a **Note**, for example what the damage was. Optional.

![The Issue Stock form. Quantity to Deduct is marked 1, Reason 2 and Taken from which shelf 3.](2-fill-in.webp "Each shelf shows how many pieces are on it.")

:::tip What is Taken from which shelf?
You only see it when your store uses shelves and this item is on one.
- Pick the shelf, and **Where is it?** stays exact.
- Or leave **Let the app decide**. The app takes pieces that are not on a shelf first. If it has to guess a shelf, it lists it under **Shelves → Shelf issues** for someone to check.

A shelf with fewer pieces than you are removing says *(not enough)* and cannot be picked.
:::

## 3. Press Issue Stock

Click [[1]] **Issue Stock**. You see *Stock deducted successfully* and the **Stock Qty** goes down.

![The Issue Stock button at the bottom of the form is marked 1.](3-press-issue.webp "The removal is saved in the item's history with your name.")

## Who can do this

Owners, admins and managers. Stock room staff and salespeople do not see the **−** button.

## Common problems

:::faq "Insufficient stock in this location to complete the transaction"
You tried to take more than this store has. Check the store at the top of the screen and the **Max** number.
:::

:::faq "Only 2 of this item are free here: 3 are held for orders"
Some pieces are held for confirmed orders that have not been sent yet. Send or cancel those orders first, or remove fewer pieces.
:::

:::faq I removed the wrong number
Stock changes cannot be deleted. Use [Correct stock](/help/inventory/correct-stock) and type the real number of pieces.
:::

:::faq I do not see the − button
Your role cannot remove stock. Ask your shop owner for the **Correct stock counts** permission.
:::
