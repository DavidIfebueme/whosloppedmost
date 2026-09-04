import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "whosloppedmost",
  description: "a satirical 3d race visualizing github output as rats on an endless spiral",
};

interface RootLayoutProps {
  readonly children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
