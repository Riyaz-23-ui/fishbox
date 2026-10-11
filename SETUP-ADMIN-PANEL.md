# Admin panel: update fish rates every day

Open **`https://YOUR-SITE/admin.html`**, sign in, change today's prices, tick or untick **Available**, and press
**Save today's rates**. Customers see the new rates straight away (they are stored on your Netlify site).
It also works on a phone. Bookmark the page.

## One-time setup
1. Deploy the site on Netlify from Git (same as the WhatsApp setup). `package.json` and `netlify/functions/prices.mjs` are included.
   Netlify installs `@netlify/blobs` automatically and stores the rates there. No database needed.
2. Netlify → Site settings → Environment variables → add **`ADMIN_PASSWORD`**
   Use a long password (at least 8 characters) that only you know.
3. Redeploy. Open `/admin.html` and sign in.

## What customers see
- Product cards show your price with a "today's rate" tag, and the notice says when it was updated.
- Items you untick become "Sold out" and cannot be added to the cart.
- The WhatsApp order message includes the date and time the rates were updated.
- The optional "Message for customers" line shows in the notice, e.g. "Fresh seer fish arrived this morning".
- If the rates cannot be loaded, the site falls back to the demo prices in `js/config.js`.

## Add and delete fish
- **Add:** open "+ Add a new fish", enter the name (and Tamil name, category, price per kg, optional note), press **Add to list**,
  then **Save changes**. The new fish appears on the shop page with a drawn illustration for its category.
- **Delete:** press **Delete** on a fish, then **Save changes**. Customers no longer see it, and it is removed from their carts.
  Before you save, you can press **Restore**. A deleted fish from the starting list can also be restored later in the same way.

## Fish photos
- Every fish row has **Add photo / Change photo** and **Remove photo**. The "Add a new fish" form has **Choose photo** too.
- Choose a photo from your phone gallery or camera. The panel shrinks it to about 900 px (WebP/JPEG) before upload so the shop loads fast.
  Photos are uploaded as soon as you choose them, but customers only see them after you press **Save changes**.
- Allowed: JPG, PNG, WebP. Maximum 700 KB after shrinking (normal phone photos end up around 60 to 200 KB).
- Photos are stored on your Netlify site (Netlify Blobs) and shown on the product card and in the cart.
- Use your own real photos of your own fish. Do not use pictures copied from other websites.
- **Remove photo** goes back to the config photo, or the drawn illustration if there is none.
- A photo that was uploaded but never saved stays in storage unused. It does no harm.

## Good to know
- To rename a fish or change a photo or note on the starting list, edit `js/config.js`.
- The password is checked on the server. Anyone can open `admin.html`, but nobody can save without the password.
  Do not share the link and password together. Wrong guesses are slowed down on the server.
- Rates are shared by all customers. Rates for items that have no saved value fall back to the price in `config.js`.
- Not available on the plain WordPress plugin zip unless you also deploy the functions. Deploy this folder to Netlify,
  set `rates.endpoint` in `config.js` to `https://YOUR-SITE.netlify.app/api/prices`, and set `ALLOWED_ORIGIN`
  to your WordPress domain.
