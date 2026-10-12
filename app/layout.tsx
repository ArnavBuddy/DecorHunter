import type { Metadata } from "next";
import "./globals.css";
import { SidebarNav } from "../components/SidebarNav";

export const metadata: Metadata = {
  title: "HomeDecor Buyer Finder",
  description: "Discover and reach US home decor buyers with verified emails",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <SidebarNav />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
