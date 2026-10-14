---
title: Customers
summary: Add a customer, find them by phone, see everything they bought and put them in groups like VIP.
for: Sales staff, admins and owners
minutes: 2
app: /customers
appLabel: Customers
keywords: customer client buyer phone number add new edit vip group tag wholesale staff history orders gst gstin company offer discount loyal groups settings merge rename no offer messages auto join spend bulk
---

Customers are found by their **phone number**. One number belongs to one customer.

You do not have to add every customer here by hand. A bill made on the [ScaleEzy POS till](/help/settings/pos-billing-counter) with the customer's phone number on it saves the customer here by itself.

## 1. Open Customers

1. In the menu on the left, click [[1]] **Customers**.
2. [[2]] Search by phone, name, customer code or email.
3. To add someone, click [[3]] **Add customer**.

![The Customers list. Customers is marked 1 in the left menu, the search box 2 and the Add customer button 3.](1-open.webp "Click View on a row to open that customer.")

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

![Lakshmi Narayanan's page. Edit is marked 1, the Groups box 2, the Sales Orders tab 3 and the Dispatches tab 4.](3-customer-page.webp "Contact Info, Company Details and Address are on the left.")

## 4. Put a customer in a group

Offers can be made only for a group, for example *VIP*. Everyone in the group gets that offer.

1. [[1]] Type the group name, for example **VIP**, and press **Enter** or **+**.
2. [[2]] Or click a group other customers are already in. The small number shows how many customers are in it.

![The Groups box of a new customer. The Add to a group box is marked 1 and the suggested group VIP 1 is marked 2.](4-add-to-group.webp "Click the x on a group to take the customer out of it.")

It saves straight away. Read more in [How offers work](/help/offers/how-offers-work).

## 5. Manage all your groups

**Settings → Customer groups** lists every group and how many customers are in it. Click a group to open it.

- **Add customers**: type a name or phone, then press **Add**. **Remove** takes someone out.
- **No offer messages**: WhatsApp campaigns and the points-expiry reminder skip everyone in the group. Use it for customers you would rather call yourself.
- **No birthday or anniversary wishes**: the daily wishes skip them too.
- **Join by spending**: for example ₹50,000 in the last 365 days. Customers who reach it are added by themselves, checked every hour. The rule never takes anyone out.
- **Rename**, **Merge into** another group, or **Delete group**. A group that a running offer is only for cannot be merged or deleted. Change that offer first.

Bills sent from the till are not affected by any of these.

To put many customers in a group at once, open **Customers**, tick them, type the group name and press **Add to group**. The **All groups** box above the list shows one group's customers.

## Example: an offer only for VIP customers

1. Open each VIP customer's page and add them to the group **VIP**, as in step 4.
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

:::faq I don't see Customers in the menu
Your role cannot see customers. Stock room staff and inventory managers do not have Customers. Ask your shop owner.
:::

:::faq I can't add or edit a customer
Your role can see customers but not change them. Ask your shop owner.
:::

:::faq A VIP customer did not get my campaign
Their group may have **No offer messages** switched on, in **Settings → Customer groups**. Before you start a campaign, it says how many customers are left out because of their group.
:::

:::faq "An offer is only for …" when merging or deleting a group
A running offer is only for that group. Change the offer to the other group, or archive it, then try again.
:::
