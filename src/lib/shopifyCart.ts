/**
 * The Shopify Buy Button SDK cart, driven by our own Size buttons and Add to Cart button (Aes's merch mockup, 2026-11-05).
 * The SDK still owns the cart: the drawer, the line items, the green cart tab on the right, and checkout.
 * Browser only: call these from event handlers or effects.
 */

import { emitGhost } from "@/lib/ghostBus";
import { SHOP_DOMAIN, STOREFRONT_TOKEN } from "@/lib/shopify";

const SCRIPT_ID = "shopify-buy-button-script";
const SCRIPT_SRC = "https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js";
const GREEN = "#39ff14";
const INK = "#0a0a0a";

/** The parts of the SDK this file uses. The SDK ships no types. */
type BuyCart = { addVariantToCart: (variant: { id: string }, quantity?: number, openCart?: boolean) => Promise<unknown> };
type BuyUI = { createCart: (config: Record<string, unknown>) => Promise<BuyCart> };
type ShopifyBuyGlobal = {
  buildClient: (config: { domain: string; storefrontAccessToken: string }) => unknown;
  UI?: { onReady: (client: unknown) => Promise<BuyUI> };
};
const sdk = () => (window as unknown as { ShopifyBuy?: ShopifyBuyGlobal }).ShopifyBuy;

/** Counts items in the cart. The SDK's cart object isn't typed, so read it defensively. */
function cartCount(cart: unknown) {
  const c = cart as { model?: { lineItems?: { quantity?: number }[] }; lineItemCache?: { quantity?: number }[] };
  const items = c?.model?.lineItems ?? c?.lineItemCache;
  return Array.isArray(items) ? items.reduce((n, i) => n + (i?.quantity ?? 0), 0) : null;
}

const CART_CONFIG = {
  moneyFormat: "%24%7B%7Bamount%7D%7D",
  options: {
    cart: {
      events: {
        updateItemQuantity: (cart: unknown) => {
          if (cartCount(cart) === 0) emitGhost({ type: "cart-empty" });
        },
      },
      text: { title: "Cart", button: "Checkout" },
      styles: {
        button: {
          "font-family": "var(--font-sans), sans-serif",
          "font-weight": "bold",
          "text-transform": "uppercase",
          "letter-spacing": "0.1em",
          "background-color": GREEN,
          color: INK,
          "border-radius": "0px",
          ":hover": { "background-color": INK, color: "#ffffff" },
          ":focus": { "background-color": INK, color: "#ffffff" },
        },
      },
    },
    // The green tab on the right edge with the item count, as in the mockup
    toggle: {
      styles: {
        toggle: {
          "font-family": "var(--font-sans), sans-serif",
          "background-color": GREEN,
          "border-radius": "0px",
          ":hover": { "background-color": INK },
          ":focus": { "background-color": INK },
        },
        count: { color: INK, "font-weight": "bold", ":hover": { color: GREEN } },
        iconPath: { fill: INK },
      },
    },
  },
};

let cartPromise: Promise<BuyCart> | null = null;

function loadScript(): Promise<ShopifyBuyGlobal> {
  return new Promise((resolve, reject) => {
    const ready = sdk();
    if (ready?.UI) return resolve(ready);
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener("load", () => {
      const loaded = sdk();
      if (loaded?.UI) resolve(loaded);
      else reject(new Error("Shopify Buy Button did not load"));
    });
    script.addEventListener("error", () => reject(new Error("Shopify Buy Button did not load")));
  });
}

/** The one shared cart. The first call loads the SDK and shows the cart tab with anything already in the cart. */
export function getCart(): Promise<BuyCart> {
  if (!cartPromise) {
    cartPromise = loadScript()
      .then((ShopifyBuy) => {
        const client = ShopifyBuy.buildClient({ domain: SHOP_DOMAIN, storefrontAccessToken: STOREFRONT_TOKEN });
        return ShopifyBuy.UI!.onReady(client);
      })
      .then((ui) => ui.createCart(CART_CONFIG))
      .catch((err) => {
        // Let the next click try again
        cartPromise = null;
        throw err;
      });
  }
  return cartPromise;
}

/** Puts one of this variant in the cart and opens the cart drawer */
export async function addToCart(variantId: string) {
  const cart = await getCart();
  await cart.addVariantToCart({ id: variantId }, 1, true);
}
