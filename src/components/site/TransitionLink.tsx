"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useTransitionNav } from "./PageTransition";

type Props = ComponentProps<typeof Link> & {
  href: string;
  /** Word painted on the curtain while the next page loads, e.g. "Shop" */
  curtain?: string;
};

/** A Next.js Link that changes pages with the spray-paint curtain */
export default function TransitionLink({ href, curtain, onNavigate, ...rest }: Props) {
  const nav = useTransitionNav();
  const pathname = usePathname();
  return (
    <Link
      href={href}
      onNavigate={(e) => {
        onNavigate?.(e);
        if (!nav || href.split(/[?#]/)[0] === pathname) return;
        e.preventDefault();
        nav.navigate(href, curtain);
      }}
      {...rest}
    />
  );
}
