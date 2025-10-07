import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";

export const metadata: Metadata = {
  title: "Simple E-Commerce DApp - Powered by MultiBaas",
  description: "Frontend-only DApp to interact with a voting contract on Ethereum",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
