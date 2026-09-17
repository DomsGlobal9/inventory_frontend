# Writing a guide page

One page = one file: `content/<section>/<page>.md`. The section and page order live in `../sections.js`.
Pictures for a page go in `../images/<section>/<page>/`.

## Top of the file

```
---
title: Put away stock
summary: One sentence under the title. Plain words.
for: Warehouse staff, managers and owners
minutes: 2
app: /shelves/put-away          (the app screen this page is about; the Help button uses it)
appLabel: Put away              ("Open Put away")
keywords: shelf rack store keep  (extra words people might search with)
---
```

## Body

- `## 1. Open Put away` makes a numbered step. Everything under it lines up with the step text.
- `## Common problems` (no number) is a normal heading.
- `[[1]]` is the green numbered circle. It must match the number the robot marked in the picture.
- `![What the picture shows, for someone who cannot see it](1-open.webp "Caption under the picture")`
  If `1-open-phone.webp` exists too, phones get that one.
- Boxes:

```
:::tip No scanner?
Tap the item in the list instead.
:::
```
  Also `:::note` and `:::warning`.
- A common problem that opens on click:

```
:::faq The item is not in the list
Check the store name at the top right.
:::
```
- Link to another page: `[Move between shelves](/help/shelves/move)`.

## Rules

1. Plain, short sentences. Say what to click, using the exact words on the button, in **bold**.
2. One action per step. A picture under most steps.
3. First picture of a page shows the whole screen. The rest show only the part that matters.
4. Every picture is a real screenshot from the robot, never drawn, never real client data.
5. Say who can do it when not everyone can ("Only the owner or an admin sees this").
