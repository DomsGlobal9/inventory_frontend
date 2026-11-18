---
title: Customers
summary: Add a customer, find them by phone or bill number, filter the list, see everything they bought, including bills from before ScaleEzy, and see their groups like VIP.
for: Sales staff, admins and owners
minutes: 2
app: /customers
appLabel: Customers
keywords: customer client buyer phone number add new edit vip group tag wholesale staff history orders gst gstin company offer discount loyal groups settings merge rename no offer messages auto join spend bulk page pages next previous jump filter filters bought no bills earlier records new in shop past purchases old bills earlier bills imported loaded bill number invoice delete erase remove crm
---

Customers are found by their **phone number**. One number belongs to one customer.

You do not have to add every customer here by hand. A bill made on the [ScaleEzy POS till](/help/settings/pos-billing-counter) with the customer's phone number on it saves the customer here by itself.

## 1. Open Customers

1. In the menu on the left, click [[1]] **Customers**.
2. [[2]] Search by phone, name, customer code, email or **bill number**. For your order numbers, *SO-000078*, *SO-78* or just *78* all work. A till invoice number, a Shopify order number or the number on an earlier bill must be typed in full.
3. To add someone, click [[3]] **Add customer**.

![The Customers list. Customers is marked 1 in the left menu, the search box 2 and the Add customer button 3.](1-open.webp "Click View on a row to open that customer.")

## Pages and filters

The list shows **10 customers at a time**.

1. [[1]] The filter buttons. Each opens a short list:
   - **Bought**: *Has bills* or *No bills yet*. Earlier bills count too (see below).
   - **Where from**: *Earlier records*, the customers your shop had before ScaleEzy, or *New in shop*, everyone added since.
   - **Phone**: *Has a phone* or *No phone*.
   - **WhatsApp offers**: *Agreed*, *Not agreed* or *Said STOP*.
   - **Added**: *Today*, *Last 7 days* or *Last 30 days*.
   - **Group**: the customers of one group.
   - The sort: *Newest first*, *Oldest first* or *Name, A to Z*.
2. [[2]] Under the list: which customers you see, for example *1–10 of 1,780 customers*, with **Previous** and **Next**.
3. [[3]] To go straight to a page, type its number in the **Page** box and press **Enter**.

![The Customers list with the filters marked 1, the count with Previous and Next 2, and the Page box 3.](1-pages-and-filters.webp "Each choice shows as a chip. Click its ✕ to remove it, or Clear all.")

The search, filters and page are in the page's address. Open a customer and press **Back**, and you are on the same page of the same list.

## 2. Add a customer

1. [[1]] Type the **Phone** number. A green line shows how it will be saved, for example *Saved as +91 99123 45678*.
2. [[2]] Type the **Name**.
3. Email, Company and GSTIN are optional. A GSTIN is only for a business customer: when the ScaleEzy POS till makes a tax invoice to them, the bill shows *Bill to* with their name, GSTIN and address, and so does its receipt here. If the till's bill carries a GSTIN and the customer has none saved, it is saved here for you. GST is optional: leave it empty for everyone else. A bill of ₹50,000 or more to a customer without a GSTIN also shows *Bill to*, with their name and address, when the cashier types them in at the till.
4. Click [[3]] **Add customer**.

![The Add customer form. Phone with 99123 45678 is marked 1, Name with Kavya Menon is marked 2 and the Add customer button is marked 3.](2-add-customer.webp "The customer page opens once they are saved.")

If the number is already saved for someone, you see who has it and a button to open them:

![A red message: Lakshmi Narayanan is already saved with that number, with an Open Lakshmi Narayanan button.](2-number-taken.webp "You were most likely looking for this customer already.")

## 3. The customer page

1. [[1]] **Edit** changes their phone, name, email, company or GSTIN.
2. [[2]] **Groups** shows the groups they are in.
3. [[3]] **Sales Orders** lists everything they bought. Click **View** to open an order.
4. [[4]] **Dispatches** lists what was sent or handed to them. This is where you book a return.
5. **Past purchases**, when they have earlier bills: see below.

![Lakshmi Narayanan's page. Edit is marked 1, the Groups box 2, the Sales Orders tab 3 and the Dispatches tab 4.](3-customer-page.webp "Contact Info, Company Details and Address are on the left.")

## Bills from before ScaleEzy

If your shop's old customer list and bills were loaded into ScaleEzy, those customers show **Earlier records** under **Where from**, and their page has a **Past purchases** tab.

1. [[1]] **Past purchases** with how many earlier bills they have.
2. [[2]] Each bill: its number, the items with their price, the amount and how it was paid. A line taken back on the same bill says **Taken back on the same bill**.

![Past purchases for a customer with earlier bills. The tab is marked 1 and a bill 2.](3-past-purchases.webp "Earlier bills have no dates, so the customer never shows as away or slipping.")

Earlier bills count as bills: such a customer is under **Bought: Has bills**, and in ScaleEzy CRM their card says *Past customer* with how many earlier bills. They are never sent a message just because they were loaded.

Loading earlier records is done once, by ScaleEzy, from your old billing software's export. Ask ScaleEzy support.

## 4. A customer's groups

Offers can be made only for a group, for example *VIP*. Everyone in the group gets that offer, at the till and online.

A customer's page shows the groups they are in, in the **Groups** box. Groups are made and changed in **ScaleEzy CRM**: putting customers in a group or taking them out, renaming, merging or deleting a group, and its rules. If your shop has CRM, **Change groups in CRM** on the box opens the customer there.

To see one group's customers here, use the **Group** filter above the **Customers** list. Read more in [How offers work](/help/offers/how-offers-work).

## 5. Group rules

A group's rules are set in ScaleEzy CRM, and Inventory follows them:

- **No offer messages**: the reminder before points lapse skips everyone in the group.
- Bills from the till are never affected.

## Delete a customer

Only the shop **owner** sees **Delete customer**, at the bottom of the customer's page.

- A customer with **no bills** is deleted for good.
- A customer **with bills** has their **personal details erased**: name, phone, email, notes, addresses, and what they looked at and tried on. Their bills stay, because the law says a shop keeps them.

The box says which will happen before you confirm, and asks you to type a word to be sure.

If your shop uses **ScaleEzy CRM**, the customer's page shows **Open in CRM**, and customers are deleted there.

## Example: an offer only for VIP customers

1. In ScaleEzy CRM, put each VIP customer in the group **VIP**.
2. Go to **Offers** and create the offer. See [Create an offer](/help/offers/create-an-offer).
3. Under **Customers**, choose **Some groups**, then click the **VIP** group. The small number shows how many customers are in it.
4. Save the offer.

Online, the offer comes off only when the order has a customer from the VIP group on it. An order with no customer, or a customer who is not in the group, does not get it. At the POS till it works the same way: the offer comes off when the bill has a VIP customer's phone number on it.

## Common problems

:::faq ... is already saved with that number.
Another customer has this phone number. Click **Open** to go to them. If it really is a different person, check the number with the customer.
:::

:::faq I can't find a customer
Search with only the last few digits of the phone, or only the first name. You can also search by the customer code or the email.
:::

:::faq The bill number finds nobody
Type the whole number, as it is on the bill. Only your own order numbers can be shortened, to *SO-78* or *78*. Part of any other bill number is not searched, so that it never finds the wrong customer.
:::

:::faq I don't see Customers in the menu
Your role cannot see customers. Stock room staff and inventory managers do not have Customers. Ask your shop owner.
:::

:::faq I can't add or edit a customer
Your role can see customers but not change them. Ask your shop owner.
:::

:::faq A VIP customer did not get my campaign
Campaigns are sent from ScaleEzy CRM. In CRM, check whether their group has **No offer messages** switched on.
:::

:::faq "An offer is only for …" when merging or deleting a group
In ScaleEzy CRM, a group that a running offer is only for cannot be merged or deleted. In Inventory, change the offer to the other group, or archive it, then try again in CRM.
:::
