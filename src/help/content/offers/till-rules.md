---
title: Till rules
summary: Set the most a cashier may take off a sale by hand. Bigger discounts need a manager.
for: Owners and admins (sales staff can read it)
minutes: 2
app: /offers
appLabel: Offers
keywords: till rules discount by hand manual discount limit cashier percentage maximum manager reason bargain
---

At the counter, sales staff can take money off by hand, for example for a small mark on a saree. Every discount by hand needs a reason and records who gave it. **Till rules** sets how big that discount may be.

- Every shop starts with **no limit**.
- The owner or an admin sets the limit.
- Sales staff can open **Till rules** to read it, but not change it.
- Inventory managers and stock room staff do not see it.

## 1. Open Till rules

In the menu on the left, click [[1]] **Offers**, then [[2]] **Till rules** at the top right.

![The Offers screen. Offers in the menu is marked 1 and the Till rules button is marked 2.](1-open-till-rules.webp "The box that opens is called Discounts by hand.")

## 2. Set the limit

1. In [[1]] **The most a cashier may take off by hand**, type a percentage, for example *10*. Leave it empty for no limit.
2. Press [[2]] **Save**.

![Discounts by hand. The limit 10 percent of the item or bill is marked 1 and Save is marked 2.](2-set-the-limit.webp "Money taken off items and off the bill counts together.")

The limit is a percentage of what the discount comes off: the item line, or the bill. Money taken off items and off the whole bill are also added up and checked against the whole bill.

## 3. What sales staff see

Sales staff see the same box with the limit, and [[1]] *Only the shop owner can change this*.

![The Discounts by hand box as sales staff see it, with the limit 10 and the words Only the shop owner can change this marked 1, and a Close button.](3-what-sales-see.webp "Admins can change it too.")

## At the counter

If a cashier takes off more than the limit, the sale is not completed. They see a message like *Taking 1500 off … is 15% — more than the 10% the till may take off by hand. A manager has to take this one off.*

The owner and admins may always go over the limit. You can give another role that power with the permission **Take off more than the till limit by hand**, in **Settings → Roles & Permissions**.

How to take money off by hand is in [New sale](/help/orders/new-sale).

## Common problems

:::faq "Enter a percentage above 0 and up to 100, or leave it empty for no limit."
Type a number between 0 and 100, with at most two decimals, or clear the box.
:::

:::faq A salesperson cannot give a discount at all
Their role does not allow discounts by hand. Give the role **Take money off at the till, with a reason** in **Settings → Roles & Permissions**, or ask a manager to give the discount.
:::

:::faq I don't see Till rules
Your role cannot give discounts by hand or change the till rules. Ask the owner.
:::
