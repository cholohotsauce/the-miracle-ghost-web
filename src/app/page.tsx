import type { Metadata } from "next";
import GhostLanding from "@/components/GhostLanding";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="w-full bg-background text-foreground">
      <GhostLanding />
    </main>
  );
}
