# Fresh Fish Shop – WhatsApp Ordering Website

A static website (HTML + CSS + JavaScript). No server, database, login or payment gateway.
Customers pick fish, fill in delivery details and send the order to your WhatsApp.

## Files
- `index.html` – page structure
- `css/styles.css` – all styling (ocean/teal theme, mobile-first)
- `js/config.js` – **the only file you need to edit** for shop details, prices, availability, delivery fees
- `js/app.js` – cart, validation, WhatsApp message
- `images/` – put your own photos here (optional)

## 1. Set your details (js/config.js)
1. `shop.whatsappNumber` – digits only with country code, e.g. `919876543210`. **Orders go to this number.**
2. `shop.name`, `phoneDisplay`, `phoneTel`, `email`, `address`, `hours`, `mapsUrl` (paste your Google Maps share link).
3. `delivery.fee`, `freeAbove`, `minOrder`, `timeSlots`, and `servedPincodes` (leave empty to accept any pincode).
4. Each product: `price` (per kg), `available` (true/false), `note`, `image`.
   All prices are labelled "demo price" on the site. To remove the label, search for `demo price` in
   `index.html`, `js/app.js` and the footer text, once you are using real prices.
   Availability is a manual setting. The site does not check live stock.

## 2. Add real photos
Add images to `images/` and set `image: "images/seer.jpg"` per product. Also `heroImage` and `aboutImage`.
Use real photos of your own fish (about 800 px wide, JPG/WebP, under 150 KB for fast loading).
Until then, the site shows built-in illustrations.

## 3. Check before you go live
- Replace the About text, Refund/Cancellation and Privacy text in `index.html` with your real wording.
- Keep the Trust section claims only if you can deliver on them.
- Place a test order and confirm the WhatsApp message reaches your phone.
- Add a Tamil-language version later by copying `index.html` and translating the text, if needed.

## 4. Publish
Upload the folder to any static host (Netlify, Cloudflare Pages, GitHub Pages, or normal web hosting).
Or open `index.html` in a browser to preview it locally.

## How ordering works
"Place Order on WhatsApp" validates the form, builds a message, and opens
`https://wa.me/<your number>?text=<URL-encoded message>`. This works on mobile (opens the WhatsApp app) and
desktop (opens WhatsApp Web or desktop app). The customer must press **Send** in WhatsApp.
The site never says an order is confirmed. You confirm it by replying. There is no payment or order tracking.
The cart is saved in the customer's own browser only.

## WordPress version (keeps the design)
A ready plugin is included: `fresh-fish-shop-wordpress-plugin.zip`.
1. WordPress admin → Plugins → Add New → Upload Plugin → choose the zip → Activate.
2. Create a page (e.g. "Shop"), add a **Shortcode** block with `[fish_shop]`, and publish.
3. Edit prices and details in `wp-content/plugins/fresh-fish-shop/site/js/config.js` (Plugins → Plugin File Editor,
   or via FTP / hosting file manager).
4. Use full `https://` URLs for images in config.js (for example from the Media Library).
Notes:
- The plugin loads the same CSS and JS, and all styles are scoped under `.ks`, so the theme does not
  override them. The site header and footer come from your WordPress theme.
- The page works best with a full-width page template (hide the theme's page title if shown).
- For a full-width hero, use a "Full width" or "Canvas" template, or set the page container to full width.
- Editing config.js directly means plugin updates would overwrite it. Keep a backup copy.

## Automatic WhatsApp Business sending
See `SETUP-AUTOMATIC-WHATSAPP.md`. `config.js → automation.mode` can be `"live"`, `"off"` or `"demo"`.

## Daily rates admin panel
See `SETUP-ADMIN-PANEL.md`. Open `/admin.html`, sign in with `ADMIN_PASSWORD`, update rates and save.
