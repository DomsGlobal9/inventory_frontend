---
title: Connect your own website
summary: Link a website that your developer built, so it always shows your products, prices, photos and stock from ScaleEzy.
for: Owners, admins and inventory managers, with your website developer
minutes: 4
app: /settings
appLabel: Settings
keywords: website storefront connect webhook key secret api developer online shop sync send test new key pause revoke woocommerce custom site
---

Use this for a website that **your own developer** built. For a Shopify store, see [Connect Shopify](/help/settings/connect-shopify) instead.

Once connected, your website stays up to date by itself. There is nothing to export and nothing to press later. You will need your developer for two things: the **address** that receives updates, and a place to keep the **key**.

## 1. Open Storefront

1. Open **Settings** and click [[1]] **Storefront**.
2. Under the Shopify card, click [[2]] **Connect a storefront**. If you already have one, the button says **Connect another storefront**.

![The Storefront screen. Storefront is marked 1 and Connect a storefront is marked 2.](1-open.webp "You can connect more than one website.")

## 2. Fill in the form

1. [[1]] **Name**: any name, only for you. For example *My website*.
2. [[2]] **Where should we send updates?**: the address your developer gives you. It must start with **https**.
3. [[3]] **Which locations does this website sell from?**: tick the stores whose stock and prices the website shows. **Leave all unticked** to sell from every location.
4. Press [[4]] **Connect**.

![The Connect a storefront form. Name is marked 1, the address 2, Main Store ticked 3 and Connect 4.](2-fill-in.webp "ScaleEzy checks that the address exists before it connects.")

## 3. Save the key now

ScaleEzy shows a **key** for this website. Your developer needs it.

1. Press [[1]] **Copy** and send the key to your developer in a safe way.
2. Press [[2]] **I have saved it** only after the key is safely stored.

![The Key box for Lakshmi Silks website. The key is blurred in this picture. Copy is marked 1 and I have saved it is marked 2.](3-save-the-key.webp "The key is blurred in this picture. On your screen you see all of it.")

:::warning You see the key only once
ScaleEzy does not keep the key itself, so nobody can show it to you again. If it is lost, make a new one with **New key**.
:::

## 4. Your connection

The website now has its own card.

1. [[1]] The status. **WAITING FOR FIRST SYNC** means your website has not fetched your catalogue yet. ScaleEzy holds back updates until it has. After that the status is **CONNECTED**.
2. [[2]] **Send test** sends a real test update to your website and tells you if the website answered.
3. [[3]] **New key** makes a new key. **The old key stops working at once**, so give the new one to your developer.
4. [[4]] **Pause** stops updates for a while. Press **Resume** to start them again.
5. [[5]] **Revoke** ends the connection for good. It cannot be undone.
6. [[6]] **Show what has been sent** lists every update, whether it was **Delivered**, and why one failed.

![The card for Lakshmi Silks website. WAITING FOR FIRST SYNC is marked 1, Send test 2, New key 3, Pause 4, Revoke 5 and Show what has been sent 6.](4-the-connection.webp "Under the address you see the locations it sells from and the start of its key.")

In the list of updates, a failed update shows the reason and a **Send again** button.

## Common problems

:::faq Send test says "Your storefront did not accept the test"
The website did not answer correctly. Send the whole message, with its HTTP number, to your developer.
:::

:::faq "That address resolves to a private network and cannot be reached from here"
The address points inside your own office network. ScaleEzy can only send to a public web address that starts with https.
:::

:::faq Pressing Connect does nothing
**Name** and **Where should we send updates?** must both be filled in.
:::

:::faq Our developer lost the key
Press **New key** on the card and give them the new key. The old one stops working at once.
:::

:::faq The status stays WAITING FOR FIRST SYNC
Your website has not fetched the catalogue yet. Ask your developer to run the first sync with the key.
:::
