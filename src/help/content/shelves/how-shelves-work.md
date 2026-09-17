---
title: How shelves work
summary: Give every rack and shelf an address, and ScaleEzy always knows which shelf each piece is on.
for: Everyone
minutes: 3
app: /shelves
appLabel: Shelves
keywords: shelves racks cupboard almirah address label not shelved shop floor back room rule where overview bin location
---

Shelves are optional. A shop with no racks set up works exactly as before, and every piece simply shows as **Not shelved**. Once you add shelves, anyone can find any piece in seconds.

## Where to find it

In the menu on the left, click [[1]] **Shelves**. The tabs along the top [[2]] hold every shelf job: **Where is it?**, **Put away**, **Move**, **Pick**, **Count**, **Map**, **Shelf issues** and **Racks & shelves**.

![The Shelves screen. Shelves in the left menu is marked 1 and the row of tabs is marked 2.](1-the-shelves-screens.webp "You only see the tabs your role allows.")

Who sees what:

| Role | Can do |
|---|---|
| Owner, admin, inventory manager | Everything, including setting up racks, printing labels and marking shelf issues resolved |
| Stock room (warehouse) | Find, put away, move, pick and count. Not set up racks |
| Sales | Find stock with **Where is it?**, see the map and shelf issues. Not move anything |

## Every shelf has an address

You describe your shop in up to four levels: an **area** (the shop floor or the back room), a **rack or cupboard** in it, a **shelf** on that, and if you need it a **box** on the shelf. The parts join into an address like **FLOOR-C1-1**.

![Diagram: the address FLOOR-C1-1. FLOOR is the area, C1 is the cupboard, 1 is the shelf in that cupboard. A drawing of cupboard C1 shows shelf FLOOR-C1-1 above FLOOR-C1-2.](diagram-address.svg)

- Each area is either **shop floor** (where customers shop) or **back room** (your store room or godown).
- The address is printed on a label with a QR code and stuck on the shelf. Scanning the label tells ScaleEzy which shelf you mean.
- You can rename a shelf or change its address later. Printed labels keep working.

Set this up once in [Set up racks and print labels](/help/shelves/set-up-racks).

## How pieces move

![Diagram: goods arrive and are Not shelved, you put them away on a shelf, and from the shelf they are sold at the counter, picked for an online order, or moved to another shelf. Below: pieces on shelves plus Not shelved equals your stock.](diagram-flow.svg)

1. **Goods arrive.** A delivery from a supplier, a transfer from another store or a customer return adds to your stock. The new pieces are **Not shelved**.
2. **Put away.** Someone scans the item and the shelf label. See [Put away stock](/help/shelves/put-away).
3. **Find, move, pick, count.** Use [Where is it?](/help/shelves/where-is-it), [Move between shelves](/help/shelves/move), [Pick online orders](/help/shelves/pick) and [Count a shelf](/help/shelves/count).

## The one rule

**Pieces on shelves + Not shelved = your stock.**

Your stock number (on Inventory) is always the real total. Shelves only say *where* those pieces are. Putting away, moving and counting a shelf never change your stock.

:::note Not shelved is worked out, not typed
It is always your stock minus what is on shelves, so it can never disagree with itself.
:::

## Counter sales take from shelves by themselves

Nobody at the counter scans a shelf. When a sale is made, ScaleEzy takes the pieces off shelves for you, in this order:

![Diagram: a counter sale takes pieces first from shop floor shelves in walking order, then from Not shelved, and only last from back room shelves, which also raises a shelf issue.](diagram-counter-sale.svg)

On the order page you can see which shelves the pieces came off, under [[1]] **Taken from shelves**.

![The Taken from shelves box on a counter sale. FLOOR-C1-1 · 1 is marked 1: one Kanchipuram Silk Saree came off shelf FLOOR-C1-1.](2-taken-from-shelves.webp "Only people who can see shelves see this box.")

Other stock going out works the same way when nobody chose a shelf, for example damage written off or a transfer: ScaleEzy uses **Not shelved** first, then shelves, and tells you when it had to take from a shelf.

## Problems are shown, never hidden

When the shelves and your stock do not agree, ScaleEzy does not quietly fix the numbers. It lists the problem in **Shelf issues** so a person can look. For example:

- a counter sale had to take a piece from a back room shelf,
- stock went out and a shelf had to be chosen for you,
- a stock count found fewer pieces than the shelves said,
- someone picking an order or counting a shelf did not find the pieces.

Read more in [Shelf issues](/help/shelves/shelf-issues).
