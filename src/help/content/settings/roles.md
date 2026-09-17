---
title: Roles and permissions
summary: See what each ready role can do, make your own role from a ready job, and check who a change affects before you save.
for: Owners and admins
minutes: 6
app: /settings
appLabel: Settings
keywords: role roles permission permissions access rights job template new role edit delete sensitive cost price paid admin sales warehouse inventory manager owner super admin shop floor stock room buyer accounts
---

A **role** decides what a person can see and do. Every person has one role. When you change a role, it changes for **everyone** who has it.

Only the owner and people who can **Manage the team and their roles** can open **Roles & Permissions**. In the ready roles, that is the owner and **ADMIN**. Everyone else sees *You need permission to manage the team before you can change what roles can do.*

## 1. Open Roles & Permissions

1. Open **Settings** and click [[1]] **Roles & Permissions**.
2. [[2]] **New role** makes your own role.
3. [[3]] **Owner — cannot be changed** is on the owner's role.
4. [[4]] **Sees what you paid** is on every role that can see your buying prices.

![The Roles list. Roles and Permissions is marked 1, New role 2, the Owner cannot be changed tag 3 and the Sees what you paid tag 4.](1-open.webp "The people icon shows how many people have the role. Things shows how many permissions it gives.")

On each role card you see:

- the role's name and its description (or *No description*),
- the people icon with **how many people** have the role,
- **how many things** it can do (the owner's role says **everything**),
- **Edit** and a bin to delete it. The owner's role has only **View**.

## The ready roles

Every new shop starts with these five roles. You can edit or delete all of them except **SUPER_ADMIN**.

| Role | Who it is for |
|---|---|
| **SUPER_ADMIN** | The owner. Can do everything. Cannot be edited or deleted. |
| **ADMIN** | Someone who runs the shop with you. Everything the owner can do, except change the shop name, logo and letterhead, change their own password, or change the owner's login. |
| **INVENTORY_MANAGER** | Buys and looks after stock. Sees costs and money reports. Does not sell or manage the team. |
| **SALES** | Sells at the counter and takes orders. Does not see costs. |
| **WAREHOUSE** | Brings stock in, moves it, counts it, sends orders out and handles returns. No money reports. |

### What each ready role can do

*Yes* means the role can do it. *–* means it cannot.

| What | SUPER_ADMIN | ADMIN | INVENTORY_MANAGER | SALES | WAREHOUSE |
|---|---|---|---|---|---|
| See the dashboard | Yes | Yes | Yes | Yes | Yes |
| **Selling** | | | | | |
| Sell at the counter and take payment | Yes | Yes | – | Yes | – |
| Take, change and confirm orders | Yes | Yes | – | Yes | – |
| See orders | Yes | Yes | – | Yes | Yes |
| Cancel an order | Yes | Yes | – | – | – |
| Send goods out against an order | Yes | Yes | – | – | Yes |
| Returns: log, receive, check, finish | Yes | Yes | – | – | Yes |
| See, add and change customers | Yes | Yes | – | Yes | – |
| Take money off at the till, with a reason | Yes | Yes | – | Yes | – |
| Take off more than the till limit | Yes | Yes | – | – | – |
| See offers | Yes | Yes | Yes | Yes | Yes |
| Write, change, retire offers, put them on Shopify | Yes | Yes | – | – | – |
| **Products and stock** | | | | | |
| See products | Yes | Yes | Yes | Yes | Yes |
| Add and change products and selling prices | Yes | Yes | Yes | – | – |
| Trash, archive and delete products | Yes | Yes | – | – | – |
| See stock levels and stock history | Yes | Yes | Yes | – | Yes |
| Bring stock in by hand, move stock between shops | Yes | Yes | Yes | – | Yes |
| Correct stock | Yes | Yes | Yes | – | – |
| Stock counts: start, enter, finish | Yes | Yes | Yes | – | Yes |
| See where stock is kept (shelves) | Yes | Yes | Yes | Yes | Yes |
| Put stock away and move it between shelves | Yes | Yes | Yes | – | Yes |
| Set up racks and shelves, print labels | Yes | Yes | Yes | – | – |
| **Buying** | | | | | |
| Raise, change and send purchase orders | Yes | Yes | Yes | – | – |
| Receive deliveries against a purchase order | Yes | Yes | Yes | – | Yes |
| Add and change suppliers | Yes | Yes | Yes | – | – |
| Remove a supplier | Yes | Yes | – | – | – |
| **Money** | | | | | |
| See what the business paid for its stock | Yes | Yes | Yes | – | – |
| Money reports and the Day Book | Yes | Yes | Yes | – | – |
| Stock reports (movement, low stock) | Yes | Yes | Yes | – | Yes |
| **The shop** | | | | | |
| Generate try-on images | Yes | Yes | Yes | – | – |
| Stores and godowns, sizes, colours and categories | Yes | Yes | Yes | – | – |
| Manage the team and roles | Yes | Yes | – | – | – |
| Read a team member's password | Yes | Yes | – | – | – |
| Shop name, logo, letterhead, own password | Yes | – | – | – | – |

:::note WAREHOUSE sees prices on purchase orders
To receive a delivery, a person must be able to open the purchase order, and a purchase order shows what you pay. So **WAREHOUSE** sees the prices on purchase orders, even though its card has no **Sees what you paid** tag. It does not see costs anywhere else.
:::

## 2. Make a new role

1. Click **New role**.
2. Under **Start from a common job, then change it**, click [[1]] the job that is closest. The ticks for that job are filled in.
3. [[2]] **Name this job**. The job's name is filled in if the box was empty. Change it if you like. Up to 40 characters.
4. [[3]] **What do they do? (optional)**: a short note, shown on the role card.

![The New role screen. The ready jobs are marked 1, Name this job 2 and What do they do 3.](2-new-role.webp "Hold the mouse over a job to read what it is for.")

The ready jobs are only a starting point. The new role is yours to change, and changing the job list later never changes your role.

| Job | What it is for | What it fills in |
|---|---|---|
| **Shop floor** | Sells to customers. Cannot see what the shop paid or what it makes. | Counter sales, orders, customers, see products and stock |
| **Stock room** | Receives, counts and moves stock. Sees quantities, not money. | Bring stock in, move it, receive deliveries, counts, returns, send orders out, stock reports |
| **Buyer** | Orders from suppliers and decides what things cost. Sees the money. | Purchase orders, suppliers, add and change products, bring in and correct stock, costs, money reports |
| **Manager** | Runs the shop day to day, including the team. | Selling, returns, stock, counts, buying, costs, money reports, try-on, the team, stores and catalogue. Not offers, shelves, deleting products or suppliers, or reading passwords |
| **Accounts** | Reads the numbers. Cannot move stock or change prices. | Money reports, and see orders, purchase orders, suppliers, customers and stock |
| **Look, don’t touch** | Sees stock and orders. Changes nothing, and sees no money. | See products, stock, orders and customers |

No job fits? Do not click one. Start with no ticks and tick what you need.

## 3. Tick what they may do

The permissions are in six groups: **Products**, **Stock**, **Buying**, **Selling**, **Money** and **The shop**. Click a line to tick or untick it.

1. [[1]] A grey tick with **comes with something else you picked** is added by itself. You cannot untick it alone. For example, **Take an order** brings **See orders**.
2. [[2]] A blue tick is something you chose.
3. [[3]] An empty box is not allowed.

![The Selling group. See orders with comes with something else you picked is marked 1, the ticked Take an order 2 and the empty Cancel an order 3.](3-ticks.webp "Untick the thing that brought the grey tick, and the grey tick goes too.")

## 4. Watch the red tags

Some lines carry a red tag. Stop and think before you tick them.

![The Money group. See what the business paid for its stock with a sensitive tag is marked 1. See money reports with sensitive and shows what you paid tags is marked 2.](4-tags.webp "Give these only to people you trust with money.")

- [[1]] **sensitive**: few people need this. For example deleting products, removing suppliers, discounts at the till, managing the team, and reading passwords.
- [[2]] **shows what you paid**: this person will see your buying prices. **See purchase orders**, **See suppliers and what they supply** and **See money reports** have it.

A line marked **you do not have this yourself** is faded and cannot be ticked. Nobody can give a role more than they can do themselves. The owner can give everything.

When you are done, press **Save role** at the top. It works once the role has a name. Press **Back** to leave without saving.

## 5. Check who a change affects

When you **Edit** a role that people already have:

1. Change the ticks.
2. Press [[1]] **Who does this affect?** at the bottom of the role.
3. [[2]] It shows how many people have this role, and their names.
4. [[3]] It shows what they will **lose** (yellow box) or **gain** (green box). If nothing changes, it says *Nothing changes for them.*

![Editing the SALES role. Who does this affect is marked 1, the line 1 person has this role Anjali Devi is marked 2, and They will lose change a customer is marked 3.](5-who-does-this-affect.webp "Nothing changes until you press Save role.")

Nothing is saved until you press **Save role**. A new role has no **Who does this affect?**, because nobody has it yet.

After you save, the new rules apply within about half a minute. A person's menu changes the next time they open or refresh ScaleEzy.

To give a person a different role, see [Change a role, reset a password, switch someone off](/help/settings/manage-team).

## Delete a role

Click the bin on the role card. The box tells you first whether anyone uses the role.

![The Delete SALES box. It says 1 person is using this role, move them to another role first, this will not go through. Delete role is marked 1.](6-delete-role.webp "Cancel closes the box without deleting.")

- If nobody uses the role, it says *Nobody is using this role, so nothing changes for anyone.* Press [[1]] **Delete role**.
- If people use it, the delete is refused. Give those people another role in **Team & Users** first.

## The owner's role

Click **View** on **SUPER_ADMIN** to see it. Every box is ticked and nothing can be changed. It is your way back in if another role is set up wrong.

## Common problems

:::faq "1 person is using this role. Move them to another role first."
Give those people another role in **Team & Users**, then delete the role.
:::

:::faq "You already have a role called ..."
Two roles cannot have the same name. Choose a different name.
:::

:::faq "SUPER_ADMIN" is reserved for the account owner
You cannot name a role **SUPER_ADMIN**. Choose another name.
:::

:::faq Save role stays grey
The role needs a name. Type one in **Name this job**.
:::

:::faq "You cannot give a role something you do not have yourself"
You ticked something your own role cannot do. Untick it, or ask the owner to make the role.
:::

:::faq A staff member says a menu item is missing
Their role does not include it. Edit their role, tick the permission, press **Who does this affect?** to check, then **Save role**. Ask them to refresh ScaleEzy.
:::
