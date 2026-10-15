# Inventory - Bug Report

## BUG-01: Purchase order search not working with capital letters

**Steps:**

1. Go to Purchase Orders.
2. Type PO-000002 in the search box.

**Description:** PO-000002 should come in the list, but it shows "No purchase orders found". It works only if we type in small letters.

![BUG-01](screens/BUG-01-po-search-actual.png)

**Where it breaks:** src/pages/PurchaseOrders.jsx, line 115

## BUG-02: Supplier search not finding supplier by name

**Steps:**

1. Go to Purchase Orders > Suppliers.
2. Type Kanchi in the search box.

**Description:** Kanchi Weavers should come, but it shows "No suppliers found".

![BUG-02](screens/BUG-02-supplier-search-actual.png)

**Where it breaks:** src/pages/Suppliers.jsx, line 25

## BUG-03: Out of Stock count showing -1

**Steps:**

1. Go to Inventory > Stock alerts.

**Description:** Out of Stock tab should show (0), but it shows (-1).

![BUG-03](screens/BUG-03-out-of-stock-count-actual.png)

**Where it breaks:** src/pages/AlertCenter.jsx, line 96

## BUG-04: Zero stock not showing in red

**Steps:**

1. Go to Inventory.
2. See Stock Qty of Anarkali Suit Set.

**Description:** Stock 0 should show in red, but it shows in black like other items.

![BUG-04](screens/BUG-04-zero-stock-colour-actual.png)

**Where it breaks:** src/pages/InventoryOverview.jsx, line 202

## BUG-05: Stock Units showing wrong number in Products

**Steps:**

1. Go to Products.
2. See Stock Units of Chanderi Cotton Saree.

**Description:** Stock Units should show 7, but it shows 2 (same as Variants). All rows have this problem.

![BUG-05](screens/BUG-05-products-stock-units-actual.png)

**Where it breaks:** src/pages/Products.jsx, line 372

## BUG-06: Customer created date showing wrong month

**Steps:**

1. Go to Customers.
2. See the Created date under any customer.

**Description:** Customer was created on 6/10/2026, but it shows 6/9/2026.

![BUG-06](screens/BUG-06-customer-created-date-actual.png)

**Where it breaks:** src/pages/sales/Customers.jsx, line 186

## BUG-07: Top Suppliers rank starting from #0

**Steps:**

1. Go to Dashboard > Analytics.
2. See the Top Suppliers card.

**Description:** First supplier should be #1, but it shows #0.

![BUG-07](screens/BUG-07-supplier-rank-actual.png)

**Where it breaks:** src/components/dashboard/SupplierSpendWidget.jsx, line 56
