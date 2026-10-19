import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./admin.css";
// The administration console shares the storefront's single optimised family so
// the two surfaces read as one product. It is not preloaded: admin is a
// non-indexed, post-login surface, so a preload hint would only waste bandwidth.
const outfit = localFont({
  src: "../../fonts/Outfit-Latin.woff2",
  weight: "400 700",
  display: "swap",
  preload: false,
});
export const metadata: Metadata = {
  title: { default: "Administration", template: "%s | Al Mina Admin" },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={`admin-app ${outfit.className}`}>{children}</div>;
}
