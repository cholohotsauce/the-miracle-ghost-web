/** A spray-painted SOLD OUT tag across a sold product, in Aes's drip lettering */
export default function SoldOutStamp({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <span
        className={`-rotate-12 select-none whitespace-nowrap bg-foreground px-4 pb-1 pt-2 font-drip uppercase leading-none text-[var(--color-neon-pink)] ${
          size === "lg" ? "text-[clamp(3rem,10vw,6rem)]" : "text-[clamp(2rem,6vw,3rem)]"
        }`}
        // A soft halo of overspray around the tag
        style={{ boxShadow: "0 0 0 3px var(--color-background), 0 0 18px 6px rgb(10 10 10 / 0.35)" }}
      >
        Sold out
      </span>
    </div>
  );
}
