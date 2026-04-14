import "~/styles/globals.css";

import { type Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "ALTAFOTO — Tus fotos de carrera",
  description: "Encontrá y descargá tus fotos deportivas en alta resolución",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-barlow",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${barlow.variable} ${inter.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
