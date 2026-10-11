# Automatic WhatsApp Business ordering (setup)

When a customer fills the form and presses **Place Order on WhatsApp**, the website sends the order to a small
server function (`netlify/functions/send-order.js`). The function delivers it to the admin WhatsApp number
**+91 95661 50003** through the **WhatsApp Business Cloud API**. The customer does not need to press Send.

If the server is not set up or fails, the customer automatically gets a "Send order on WhatsApp" button
(the normal wa.me method), so no order is lost. Orders are never shown as confirmed. The shop must reply.

## What you need
1. A Meta (Facebook) Business account: business.facebook.com
2. A Meta developer app with the **WhatsApp** product: developers.facebook.com
3. A phone number for the business sender (WhatsApp Cloud API number). It must not be registered on a normal
   WhatsApp app unless you migrate it. The admin number (95661 50003) is a normal WhatsApp that RECEIVES orders.
4. A **permanent access token** (Business Settings → System Users → generate token with `whatsapp_business_messaging`).
5. The **Phone Number ID** (WhatsApp → API Setup).
6. A hosting account on Netlify (free plan is enough to start).

## Template (important)
WhatsApp only allows a free-form message to a person who messaged your business in the last 24 hours.
Orders come at any time, so create a message template:
- WhatsApp Manager → Message templates → Create. Category: **Utility**. Name: `new_order`. Language: English.
- Body text: `New website order: {{1}}`
- Wait for approval (often minutes to a few hours).
Then set `WA_TEMPLATE_NAME=new_order`. (Without a template, set nothing; the function sends plain text, which
only works if the admin messaged the business number in the last 24 hours. That is fine for testing.)
Meta charges for business-initiated template messages. Check Meta's current pricing for India.

## Deploy on Netlify
Functions need a Git or CLI deploy (a plain drag-and-drop of files will not include the function):
1. Put this folder in a GitHub repo, then Netlify → Add new site → Import from Git. `netlify.toml` is included.
   Or use the Netlify CLI: `npm i -g netlify-cli`, then `netlify deploy --prod`.
2. Netlify → Site settings → Environment variables. Add:

| Name | Value |
|---|---|
| `WA_TOKEN` | permanent access token |
| `WA_PHONE_NUMBER_ID` | Phone Number ID |
| `ADMIN_WA_NUMBER` | `919566150003` |
| `WA_TEMPLATE_NAME` | `new_order` (once approved) |
| `WA_TEMPLATE_LANG` | `en` |
| `ALLOWED_ORIGIN` | your site, e.g. `https://yourshop.com` (no trailing slash) |

3. Redeploy, open the site, place a test order. The message should arrive on 95661 50003.

Never put the token in `config.js` or any browser file. It stays in Netlify only.

## Using it with WordPress or other hosting
Deploy only this function on Netlify, then in `js/config.js` set the full URL:
`endpoint: "https://YOUR-SITE.netlify.app/.netlify/functions/send-order"` and set `ALLOWED_ORIGIN` to your WordPress domain.

## Notes
- The server checks the format and length of the order and ignores bots (hidden field). Add Netlify rate limiting
  or a CAPTCHA if you get spam.
- The order total is calculated in the browser. The shop confirms the final amount, so always check it before accepting.
- To turn automatic sending off, set `automation.mode` to `"off"` in `config.js`.
