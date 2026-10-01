"use client";

import { useEffect, useRef } from "react";

export default function ShopifyBuyButton({ productId }: { productId: string }) {
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

    const loadShopify = () => {
      const ShopifyBuy = (window as any).ShopifyBuy;

      if (ShopifyBuy && ShopifyBuy.UI) {
        // Initialize a placeholder client
        const client = ShopifyBuy.buildClient({
          domain: 'themiracleghost.myshopify.com',
          storefrontAccessToken: '8f303ed215e5f3413f1c496f63fa84e3',
        });

        ShopifyBuy.UI.onReady(client).then((ui: any) => {
          ui.createComponent('product', {
            id: productId,
            node: containerRef.current,
            moneyFormat: '%24%7B%7Bamount%7D%7D',
            options: {
              product: {
                styles: {
                  product: {
                    '@media (min-width: 601px)': {
                      'max-width': '100%',
                      'margin-left': '0',
                      'margin-bottom': '0px',
                    },
                    'text-align': 'center',
                  },
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

    if ((window as any).ShopifyBuy && (window as any).ShopifyBuy.UI) {
      loadShopify();
    } else {
      script.addEventListener("load", loadShopify);
    }

    return () => {
      script.removeEventListener("load", loadShopify);
      if (containerRef.current) {
        // Cleanup the mounted Shopify iframe on unmount
        containerRef.current.innerHTML = '';
      }
    };
  }, [productId]);

  return <div id={productId} ref={containerRef}></div>;
}
