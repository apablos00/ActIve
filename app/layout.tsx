import type { Metadata } from "next";
import { Cabin_Sketch, Geist, Geist_Mono, Kalam } from "next/font/google";
import ChalkFilter from "@/components/ChalkFilter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Chalk lettering: a sketchy display face for titles, a hand for body text.
const chalkDisplay = Cabin_Sketch({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-chalk-display" });
const chalkHand = Kalam({ weight: ["300", "400", "700"], subsets: ["latin"], variable: "--font-chalk" });

export const metadata: Metadata = {
  title: "Sparring",
  description: "A mentor voice that asks instead of answers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${chalkDisplay.variable} ${chalkHand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ChalkFilter />
        {children}
      </body>
    </html>
  );
}
