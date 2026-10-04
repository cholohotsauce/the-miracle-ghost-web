"use client";

import { useEffect, useRef } from "react";
import { emitGhost } from "@/lib/ghostBus";
import { SHOP_DOMAIN, STOREFRONT_TOKEN } from "@/lib/shopify";
import { track } from "@/lib/stats";

type Props = {
  productId: string;
  /** "card" shows Shopify's image, title, and price too; "button" shows only Add to Cart, for our own product pages */
  layout?: "card" | "button";
};

/** The parts of the Buy Button SDK this file uses. The SDK ships no types. */
type BuyUI = { createComponent: (kind: "product", config: Record<string, unknown>) => unknown };
type ShopifyBuyGlobal = {
  buildClient: (config: { domain: string; storefrontAccessToken: string }) => unknown;
  UI?: { onReady: (client: unknown) => Promise<BuyUI> };
};
const sdk = () => (window as unknown as { ShopifyBuy?: ShopifyBuyGlobal }).ShopifyBuy;

/** Counts items in the Buy Button cart. The SDK's cart object isn't typed, so read it defensively. */
function cartCount(cart: unknown) {
  const c = cart as { model?: { lineItems?: { quantity?: number }[] }; lineItemCache?: { quantity?: number }[] };
  const items = c?.model?.lineItems ?? c?.lineItemCache;
  return Array.isArray(items) ? items.reduce((n, i) => n + (i?.quantity ?? 0), 0) : null;
}

export default function ShopifyBuyButton({ productId, layout = "card" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent duplicate script injections
    let script = document.getElementById("shopify-buy-button-script") as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.id = "shopify-buy-button-script";
      script.src = "https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const node = containerRef.current;
    let cancelled = false;

    const loadShopify = () => {
      const ShopifyBuy = sdk();

      if (ShopifyBuy && ShopifyBuy.UI) {
        // Initialize a placeholder client
        const client = ShopifyBuy.buildClient({
          domain: SHOP_DOMAIN,
          storefrontAccessToken: STOREFRONT_TOKEN,
        });

        ShopifyBuy.UI.onReady(client).then((ui) => {
          if (cancelled || !node) return;
          ui.createComponent('product', {
            id: productId,
            node,
            moneyFormat: '%24%7B%7Bamount%7D%7D',
            options: {
              product: {
                // The ghost reacts when something goes in the cart
                events: {
                  addVariantToCart: () => {
                    emitGhost({ type: "cart-add" });
                    track("add_to_cart");
                  },
                },
                ...(layout === "button"
                  ? {
                      contents: { img: false, title: false, price: false, options: false, button: true },
                      width: "100%",
                    }
                  : {}),
                styles: {
                  product: {
                    '@media (min-width: 601px)': {
                      'max-width': '100%',
                      'margin-left': '0',
                      'margin-bottom': '0px',
                    },
                    'text-align': 'center',
                  },
                  ...(layout === "button"
                    ? { buttonWrapper: { 'margin-top': '0' } }
                    : {}),
                  title: {
                    'font-family': 'var(--font-sans), sans-serif',
                    'font-weight': '900',
                    'text-transform': 'uppercase',
                    'letter-spacing': '0.1em',
                    'color': '#0a0a0a',
                  },
                  price: {
                    'font-family': 'var(--font-mono), monospace',
                    'color': '#0a0a0a',
                  },
                  compareAt: {
                    'font-family': 'var(--font-mono), monospace',
                    'color': '#ff00ff', // Glowing pink
                  },
                  button: {
                    ...(layout === "button" ? { width: '100%' } : {}),
                    'font-family': 'var(--font-mono), monospace',
                    'font-weight': 'bold',
                    'text-transform': 'uppercase',
                    'letter-spacing': '0.1em',
                    'background-color': '#0a0a0a',
                    'color': '#ffffff',
                    'border': '2px solid #0a0a0a',
                    'border-radius': '0px',
                    'padding': '16px 24px', // Thumb-sized tap target
                    ':hover': {
                      'background-color': '#39ff14', // Toxic green
                      'color': '#0a0a0a',
                    },
                    ':focus': {
                      'background-color': '#39ff14',
                      'color': '#0a0a0a',
                    },
                  },
                },
                text: {
                  button: 'Add to Cart',
                },
              },
              cart: {
                events: {
                  updateItemQuantity: (cart: unknown) => {
                    if (cartCount(cart) === 0) emitGhost({ type: "cart-empty" });
                  },
                },
                styles: {
                  button: {
                    'font-family': 'var(--font-mono), monospace',
                    'font-weight': 'bold',
                    'text-transform': 'uppercase',
                    'background-color': '#0a0a0a',
                    'color': '#ffffff',
                    'border-radius': '0px',
                    ':hover': {
                      'background-color': '#39ff14',
                      'color': '#0a0a0a',
                    },
                    ':focus': {
                      'background-color': '#39ff14',
                      'color': '#0a0a0a',
                    },
                  },
                },
              },
              toggle: {
                styles: {
                  toggle: {
                    'font-family': 'var(--font-mono), monospace',
                    'background-color': '#0a0a0a',
                    'border-radius': '0px',
                    ':hover': {
                      'background-color': '#ff00ff', // Glowing pink
                    },
                    ':focus': {
                      'background-color': '#ff00ff',
                    },
                  },
                  count: {
                    'color': '#39ff14',
                  },
                  iconPath: {
                    'fill': '#ffffff',
                  },
                },
              },
            },
          });
        });
      }
    };

    if (sdk()?.UI) {
      loadShopify();
    } else {
      script.addEventListener("load", loadShopify);
    }

    return () => {
      cancelled = true;
      script.removeEventListener("load", loadShopify);
      // Clean up the mounted Shopify iframe on unmount
      if (node) node.innerHTML = '';
    };
  }, [productId, layout]);

  return <div id={productId} ref={containerRef}></div>;
}
