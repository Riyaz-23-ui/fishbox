/* ==========================================================================
   SHOP CONFIGURATION — edit this file only. No other file needs changes
   to update shop details, prices, availability or delivery fees.
   ========================================================================== */
window.SHOP_CONFIG = {

  /* ---- Shop details (PLACEHOLDERS — replace with real details) ---- */
  shop: {
    name: "Kadal Fresh Fish & Seafood",            // placeholder name
    tagline: "Freshness You Can Taste. Quality You Can Trust.",
    phoneDisplay: "+91 90256 79752",               // shown on the site
    phoneTel: "+919025679752",                     // used for tap-to-call
    whatsappNumber: "919566150003",                // digits only, with country code (91 = India)
    email: "hello@example.com",
    address: "No. 12, Market Road, Your Town, Tamil Nadu 600000",
    mapsUrl: "https://maps.google.com/",           // paste your Google Maps share link here
    hours: [
      ["Monday – Saturday", "6:00 AM – 1:00 PM, 4:00 PM – 8:00 PM"],
      ["Sunday", "6:00 AM – 1:00 PM"]
    ],
    orderPrefix: "KFS"                             // order IDs look like KFS-261010-4821
  },

  /* ---- Images (optional). Leave "" to use the built-in illustrations. ----
     Use paths like "images/hero.jpg", or full https:// URLs (best for WordPress). */
  heroImage: "",
  aboutImage: "",

  /* ---- Automatic WhatsApp Business sending ----
     mode "live": the form sends the order to your server function, which delivers it to the
                  admin WhatsApp number using the WhatsApp Business Cloud API (see SETUP-AUTOMATIC-WHATSAPP.md).
                  If the server is not set up or fails, the customer gets a button to send the order
                  from their own WhatsApp instead.
     mode "off":  always use the plain WhatsApp link (customer presses Send).
     mode "demo": preview only. Shows what would happen. Sends nothing.
     endpoint:    your function URL. On Netlify: "/.netlify/functions/send-order"                    */
  automation: { mode: "live", endpoint: "/.netlify/functions/send-order" },

  /* ---- Daily rates from the admin panel ----
     The shop page loads today's rates saved in admin.html. If this fails, the prices in the
     product list below are used (shown as demo prices). Set endpoint to "" to turn this off. */
  rates: { endpoint: "/api/prices", imageEndpoint: "/api/img" },

  /* ---- Delivery ---- */
  currency: "₹",
  delivery: {
    fee: 40,                 // flat home-delivery fee (₹)
    freeAbove: 1000,         // free delivery when subtotal reaches this (0 = never free)
    pickupFee: 0,            // fee for store pickup
    minOrder: 200,           // minimum subtotal (₹) to place an order (0 = none)
    servedPincodes: [],      // e.g. ["600001","600002"]. Empty = accept any 6-digit pincode
    timeSlots: [
      "As soon as possible",
      "Morning (7 AM – 10 AM)",
      "Late morning (10 AM – 1 PM)",
      "Evening (4 PM – 7 PM)"
    ]
  },

  /* ---- Quantity selector (kg) ---- */
  qty: { min: 0.5, step: 0.5, max: 10 },

  /* ---- Categories ---- */
  categories: [
    { id: "sea",        name: "Sea Fish",        tamil: "கடல் மீன்",     kind: "fish",  color: "#0B6FA4" },
    { id: "freshwater", name: "Freshwater Fish", tamil: "நன்னீர் மீன்",  kind: "fish",  color: "#0FA3A0" },
    { id: "prawns",     name: "Prawns",          tamil: "இறால்",         kind: "prawn", color: "#E8795C" },
    { id: "crab",       name: "Crab",            tamil: "நண்டு",         kind: "crab",  color: "#D2553F" },
    { id: "squid",      name: "Squid",           tamil: "கணவாய்",        kind: "squid", color: "#7A6FC4" },
    { id: "cleaned",    name: "Cleaned Fish",    tamil: "சுத்தம் செய்தது", kind: "fish",  color: "#127D8C" }
  ],

  /* ---- Products ----
     price       : DEMO price per kg in ₹ — edit freely
     available   : true / false — you set this; the site does not check live stock
     cleaningAvailable : true = also listed under "Cleaned Fish"
     image       : optional photo path/URL ("" = illustration)
     kind        : illustration style: fish | prawn | crab | squid                    */
  products: [
    { id: "seer",     name: "Seer Fish (Vanjaram)",    tamil: "வஞ்சிரம்",  category: "sea",        price: 1100, available: true,  cleaningAvailable: true,  note: "Popular for fry and curry. Sold as steaks or whole.", image: "", color: "#0B6FA4", kind: "fish" },
    { id: "sardine",  name: "Sardine (Mathi)",          tamil: "மத்தி",      category: "sea",        price: 220,  available: true,  cleaningAvailable: true,  note: "Small, everyday fish. Great for fish curry.",        image: "", color: "#3C8DBC", kind: "fish" },
    { id: "mackerel", name: "Indian Mackerel (Ayala)",  tamil: "அயிலை",     category: "sea",        price: 320,  available: true,  cleaningAvailable: true,  note: "Rich flavour. Suits fry and kuzhambu.",             image: "", color: "#127D8C", kind: "fish" },
    { id: "pomfret",  name: "Pomfret (Vavval)",         tamil: "வவ்வால்",   category: "sea",        price: 750,  available: true,  cleaningAvailable: true,  note: "Soft white flesh. Best for tawa fry.",              image: "", color: "#6C8EA4", kind: "fish" },
    { id: "prawns",   name: "Prawns (Eral)",            tamil: "இறால்",      category: "prawns",     price: 550,  available: true,  cleaningAvailable: true,  note: "Medium size. Can be peeled and deveined.",          image: "", color: "#E8795C", kind: "prawn" },
    { id: "crab",     name: "Crab (Nandu)",             tamil: "நண்டு",      category: "crab",       price: 600,  available: true,  cleaningAvailable: true,  note: "Cut into pieces on request.",                      image: "", color: "#D2553F", kind: "crab" },
    { id: "tilapia",  name: "Tilapia",                  tamil: "திலேப்பியா", category: "freshwater", price: 180,  available: false, cleaningAvailable: true,  note: "Mild taste, few bones.",                           image: "", color: "#0FA3A0", kind: "fish" },
    { id: "squid",    name: "Squid",                    tamil: "கணவாய்",     category: "squid",      price: 400,  available: true,  cleaningAvailable: true,  note: "Cleaned and cut into rings on request.",           image: "", color: "#7A6FC4", kind: "squid" }
  ]
};
