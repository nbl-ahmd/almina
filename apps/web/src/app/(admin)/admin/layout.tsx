import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./admin.css";
// Administration uses the approved Manrope family. It is loaded as its own
// instance and never preloaded: this is a post-login, non-indexed surface.
const adminFont = localFont({
  src: "../../fonts/market-green/Manrope.ttf",
  weight: "400 700",
  display: "swap",
  preload: false,
});
export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: {capable:true,title:"Al Mina Operations",statusBarStyle:"default"},
  title: { default: "Administration", template: "%s | Al Mina Admin" },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={`admin-app ${adminFont.className} min-h-dvh bg-canvas text-sm leading-5 text-ink antialiased`}>{children}</div>;
}
