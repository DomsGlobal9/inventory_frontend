---
title: Import customers from a sheet
summary: Add many customers at once from an Excel or CSV file. ScaleEzy checks the file first and adds nobody until you agree.
for: Owners, admins and staff who can add customers
minutes: 4
app: /customers?import=1
appLabel: Import customers
keywords: import customers excel csv xlsx sheet spreadsheet bulk upload many customers phone list old register billing software example file template take back out undo wrong file mobile numbers
---

Use this when you have a list of customers in Excel, for example from your old register or billing software. Each row of the sheet is one customer.

Only people who can add customers see **Import customers**.

## 1. Open Import customers

1. In the menu on the left, click [[1]] **Customers**.
2. At the top, click [[2]] **Import customers**.

![The Customers screen. Customers is marked 1 in the menu and the Import customers button is marked 2.](1-open.webp "Import customers is next to Add customer.")

## 2. Fill in the example file and choose it

1. Click [[1]] **Download the example file (Excel)**. You get a file called *customers-import-example.xlsx*. Open it in Excel.
2. Type your customers on the **Customers** sheet, one customer in each row. Keep the first row (the column names) as it is. The second sheet, **How to fill**, shows examples.
3. Save the file.
4. Back in ScaleEzy, click [[2]] **Choose a file** and choose your file. You can also drag the file onto the box.

![The Import customers window. Download the example file is marked 1 and the Choose a file box is marked 2.](2-choose.webp "One file can hold up to 5,000 customers.")

### What goes in each column

| Column | What to type |
|---|---|
| **Name** | The customer's name. Needed. |
| **Phone** | A 10-digit mobile number. Needed. Spaces, *+91* or a *0* in front are fine. |
| **Email** | Optional. |
| **Birthday**, **Anniversary** | Optional. Day first, for example *14-08* or *14-08-1990*. The year is not kept. |
| **Address** | Optional. |
| **GST number**, **Company** | Optional, for business buyers. |
| **Notes** | Optional. Anything you want to remember about the customer. |

:::tip Your own sheet works too
The column names do not have to match exactly. Names like *Mobile No.*, *Customer Name*, *DOB* and *City* are understood. Columns that ScaleEzy does not use are named on the next step, so nothing goes missing without you knowing.
:::

:::warning If Excel shows a number like 9.84802E+09
Excel has shortened the number and its last digits are lost. Set the Phone column to **Text** in Excel, type the numbers again and save. In the example file the Phone column is already set to Text.
:::

## 3. Check what will happen

ScaleEzy reads the file and shows what it will do. Nobody is added yet.

1. [[1]] Three numbers. **New customers** will be added. **Already in your list** means the phone number belongs to a customer you already have. **Cannot be added** are rows with a mistake.
2. [[2]] Every row that will not be added, with its row number in your sheet and the reason, for example *Phone 98480 2233 has 9 digits*.
3. To add the new customers, tick [[3]] the box, then click [[4]] the button that says how many will be added, for example **Add 3 customers**.

![The check. The three numbers are marked 1, the rows that will not be added 2, the tick box 3 and the Add 3 customers button 4.](3-check.webp "To fix the mistakes first, click Choose another file, correct your sheet and choose it again.")

:::note A customer you already have is never changed
If a phone number in your sheet belongs to a customer already in your list, that customer is left exactly as they are. An old sheet cannot overwrite newer details.
:::

:::note Nobody gets WhatsApp offers from an import
A list is not a customer's yes. Each customer agrees to offers at the till or in the shop, as before.
:::

## 4. Done

1. [[1]] ScaleEzy says how many customers were added. They are in your list at once, and the till finds them by phone number. If your shop uses ScaleEzy CRM, they reach CRM within a few minutes.
2. [[2]] Your imports are listed with the date, how many were added and who did it.

![The window after the import: 3 customers added is marked 1 and the Take back out button beside the file is marked 2.](4-done.webp "Click Done to close the window.")

## Take an import back out

If you imported the wrong file, the owner can take it back out.

1. Click **Import customers** again. Under **Your imports**, click **Take back out** beside the file.
2. ScaleEzy says how many customers will go. Click **Take back out** to agree.

Only customers who have not been used since are removed. A customer who has since got a bill, points, an address or a change stays in your list as an ordinary customer.

:::note Only the owner sees Take back out
Taking an import back out deletes customers, so it is the owner's alone.
:::

## Common problems

:::faq "The file needs a Name and a Phone column"
The first row of your sheet must hold the column names, and two of them must be the name and the phone number. Download the example file to see how.
:::

:::faq A row says the number is "already" another customer
That phone number belongs to a customer already in your list, so the row is left out. To change that customer's details, open them from the Customers list and click **Edit**.
:::

:::faq The same number is in my sheet twice
Only the first row with that number is added. The other row is listed with the row it repeats.
:::

:::faq I have more than 5,000 customers
Split the sheet into files of up to 5,000 rows and import them one after the other.
:::

:::faq I imported the right file but some customers are missing
Open **Import customers** and choose the same file again. Customers already added show as *Already in your list*, and the rows with mistakes are listed with the reason.
:::
