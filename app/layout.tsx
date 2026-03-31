import type { Metadata } from "next";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Seasonal — Video Creator",
  description: "Create videos with Remotion",
  icons: { icon: `${BASE}/favicon.svg` },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
