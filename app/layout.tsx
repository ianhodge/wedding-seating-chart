import type { Metadata } from "next";
import { Pacifico, Cormorant_Garamond, Quicksand } from "next/font/google";
import "./globals.css";

const script = Pacifico({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
});

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = Quicksand({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Matt & Ian \u2014 Seating Chart \uD83D\uDC8D",
  description: "Our totally over-the-top, drag-and-drop wedding seating planner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${script.variable} ${serif.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
