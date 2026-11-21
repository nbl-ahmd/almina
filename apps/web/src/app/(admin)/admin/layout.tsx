import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";
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
  return <div className="admin-app">{children}</div>;
}
