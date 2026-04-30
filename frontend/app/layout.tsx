import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "omni-label-local",
  description: "Simple object detection labeling and training",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
