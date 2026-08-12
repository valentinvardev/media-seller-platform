import "~/styles/globals.css";

import { type Metadata } from "next";
import { Syne, Inter } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: {
    default: "AltaFoto",
    template: "%s · AltaFoto",
  },
  description: "Encontrá y descargá tus fotos deportivas en alta resolución",
  // Iconos y manifest se toman de las convenciones de Next.js:
  // src/app/icon.png, src/app/apple-icon.png y src/app/manifest.ts
};

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${syne.variable} ${inter.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
