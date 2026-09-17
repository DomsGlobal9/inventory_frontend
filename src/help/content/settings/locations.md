---
title: Stores and godowns
summary: Add each shop, godown or online stock place as a location. Change it, switch it off, or delete one you never used.
for: Owners, admins and inventory managers
minutes: 5
app: /settings
appLabel: Settings
keywords: location locations store branch godown warehouse online virtual add new shop address phone code type active inactive switch off close delete remove edit
---

A **location** is any place where you keep stock: a shop, a godown, or stock kept only for online orders. Every stock number in ScaleEzy belongs to one location. Your team picks the location they work in at the top of the screen.

Only people who can **Add and change shops and warehouses** see **Stock Locations**. In the ready roles, that is the owner, **ADMIN** and **INVENTORY_MANAGER**.

## 1. Open Stock Locations

1. Open **Settings** and click [[1]] **Stock Locations**.
2. Click [[2]] **Add Location**.

![The Stock Locations screen with Main Store and Godown in the list. Stock Locations is marked 1 and Add Location is marked 2.](1-open.webp "Every location you have is listed here, oldest first.")

## 2. Fill in the form

| Box | What to type | Needed? |
|---|---|---|
| [[1]] **Location Name** | The name your team sees, for example *Brodipet Branch*. | Yes |
| [[2]] **Location Code (Unique)** | A short code, for example *BRODIPET*. Small letters change to capitals by themselves. No two locations can have the same code. | Yes |
| [[3]] **Type** | Retail Store, Warehouse or Online / Virtual. See step 3. | Yes. Retail Store is already chosen. |
| [[4]] **Address (optional)** | The full address with PIN code. Up to 300 characters. | No |
| [[5]] **Phone at this store (optional)** | Digits, spaces, **+** and **-** only. Up to 20 characters. | No |
| [[6]] **Active Status** | Green means on. Leave it on for a place you use. See *Switch a location off* below. | Already on |

Then press [[7]] **Create Location**. A message says *Location created successfully*.

![The Create New Location form for Brodipet Branch. Location Name is marked 1, Location Code 2, Type 3, Address 4, Phone 5, Active Status 6 and Create Location 7.](2-fill-in.webp "Cancel closes the form without saving.")

:::note Where the address and phone are used
- **Purchase orders** to this location print its address as the place the supplier delivers to.
- **Counter receipts** from this location print its address and phone.

Left empty, the address and phone from [Shop name, logo and letterhead](/help/settings/shop-details) are used instead.
:::

## 3. Choose the type

Open the **Type** list and pick one:

![The Type list open, showing Retail Store, Warehouse and Online / Virtual.](3-types.webp "Retail Store is chosen when you do not change it.")

| In the form | In the list | Use it for |
|---|---|---|
| **Retail Store** | STORE | A shop where customers come and buy. |
| **Warehouse** | WAREHOUSE | A godown or store room. |
| **Online / Virtual** | ONLINE | Stock kept only for online orders, not a place customers visit. |

:::tip The type is a label
The type helps your team tell locations apart. It does not change what a location can do. Stock can be brought in, moved and sold at any location that is switched on.
:::

## 4. Find it in the list

The new location is added to the list, and to the store list at the top of the screen.

1. [[1]] **Search locations by name or code...** finds one when you have many.
2. [[2]] The type.
3. [[3]] **Active** (green) or **Inactive** (red).
4. [[4]] The pencil opens the form again, now called **Edit Location**. Change anything and press **Save Changes**.
5. [[5]] The bin deletes the location. See *Delete a location* below.

![The locations list. The search box is marked 1. For Brodipet Branch, the type STORE is marked 2, Active 3, the pencil 4 and the bin 5.](4-in-the-list.webp "The address and phone show under the code.")

:::tip On a phone
The list is wider than the screen. Slide it sideways to reach the pencil and the bin.
:::

## Switch a location off

When a shop closes or you stop using a godown, switch it off. Its history stays.

1. Click the pencil next to the location.
2. Click [[1]] **Active Status** so it turns grey.
3. Press [[2]] **Save Changes**.

![The Edit Location form. The Active Status switch, now grey, is marked 1 and Save Changes is marked 2.](5-switch-off.webp "A switched-off store can no longer sell, take orders or receive supplier deliveries.")

[[1]] The list now shows **Inactive**.

![Brodipet Branch in the list with the status Inactive marked 1.](6-inactive.webp "Click the pencil and turn Active Status on again to switch it back on.")

What changes when a location is **Inactive**:

- It **cannot sell at the counter**. Finding an item in **New sale** there is refused with *…is closed, so it cannot sell*.
- It **cannot take orders**. A new order there is refused with *…is closed, so it cannot take orders*.
- Purchase orders **cannot be delivered** there, and a delivery cannot be received into it.
- It still shows in the locations list and in the store list at the top, so you can switch it on again.

### When switching off is refused

ScaleEzy **refuses** to switch a location off while it still has **stock**, or has **purchase orders that are not finished** (draft, sent or partly received).

[[1]] A red message says what is in the way, for example *This store still has 62 pieces in stock and 2 open purchase orders*. Nothing is saved, and the form stays open.

![The Edit Location form for Main Store with Active Status turned off, and a red message marked 1: This store still has 62 pieces in stock and 2 open purchase orders. Move the stock and finish or move the orders before switching it off.](7-switch-off-refused.webp "Press Cancel to close the form without changes.")

First move the stock with a [transfer](/help/transfers/transfers), and receive, cancel or move the purchase orders. Then switch it off.

## Delete a location

Deleting is only for a location you added by mistake, or that **never had any stock**. For a place you used, switch it off instead.

1. Click the bin next to the location.
2. Read the box, then press [[1]] **Delete location**.

![The Delete location box for Brodipet Branch. It says the location will be removed and that stock history is kept. Delete location is marked 1.](8-delete-box.webp "Cancel or the X closes the box without deleting.")

A message says the location is deleted. Its racks and shelves are deleted with it.

:::warning A deleted location cannot be brought back
If you may use it again, switch it off instead.
:::

### When deleting is refused

ScaleEzy **refuses** to delete a location, and nothing changes, when:

| What is in the way | The red message says |
|---|---|
| It still holds stock | *"Main Store" still holds 62 pieces across 9 items. Move that stock to another location first, or count it out, and then this can be deleted.* |
| Purchase orders are still on their way to it | *"…" still has purchase orders on their way to it (PO-000003, …). Change where those orders are delivered, or cancel them, and then this can be deleted.* |
| It had stock at any time before, or sales were made there | *Something went wrong at our end. Please try again.* Trying again does not help. Switch it off instead. |

![The Delete location box for Main Store, with a red message marked 1: Main Store still holds 62 pieces across 9 items.](9-delete-refused.webp "The box stays open so you can read why.")

## Common problems

:::faq I don't see Stock Locations in Settings
Your role cannot add or change locations. Ask your shop owner.
:::

:::faq Create Location says "Something went wrong at our end"
Most likely another location already uses that **Location Code**. Choose a different code, for example *BRODIPET-2*, and press **Create Location** again.
:::

:::faq "Please enter the location name."
**Location Name** and **Location Code** must both be filled in.
:::

:::faq "Use digits, spaces, + and - only for the phone number."
Take out letters, dots and brackets from **Phone at this store**, for example type *+91 98480 22222*.
:::

:::faq It will not let me switch a store off
The store still has stock or unfinished purchase orders. The message tells you which. Move the stock, finish or move the orders, then try again.
:::

:::faq Delete says "Something went wrong at our end" for a store with no stock
The location was used before: stock moved there or sales were made there. Its history keeps it. Switch it off instead of deleting it.
:::

:::faq A closed store still shows at the top of the screen
Inactive locations stay in the store list. Pick your working store there. Selling at the closed one is refused.
:::
