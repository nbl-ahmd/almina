import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./admin.css";
// One family carries the whole console. Geist is shared with the storefront
// but loaded as its own instance and never preloaded: administration is a
// non-indexed, post-login surface, so a preload hint would only waste bandwidth.
const adminFont = localFont({
  src: "../../fonts/Geist-Variable.ttf",
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
  return <div className={`admin-app ${adminFont.className}`}>{children}</div>;
}
