import type { Metadata } from "next";
import { ViewTransition } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChairBook — Bookings, customers & insights for independent salons",
  description: "ChairBook turns your WhatsApp into a real booking system. Take appointments, remember every customer, and see exactly where your revenue comes from — from a single phone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ViewTransition>
          {children}
        </ViewTransition>
      </body>
    </html>
  );
}
