import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ซุปเปอร์เศรษฐี — เล่นออนไลน์",
  description: "เกมกระดานซุปเปอร์เศรษฐี เล่นออนไลน์แบบเรียลไทม์",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Charmonman:wght@400;700&family=Mitr:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
