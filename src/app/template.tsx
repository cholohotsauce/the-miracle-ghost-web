/**
 * Page changes are animated by the spray-paint curtain (components/site/PageTransition.tsx),
 * so the page itself just renders.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex-grow w-full h-full">{children}</div>;
}
