import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SessionProvider } from "@/components/SessionProvider";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import ThemeEngine from "@/components/design/ThemeEngine";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Fatiha.ru — Исламская онлайн-платформа",
  description: "Сертифицированная платформа для изучения Ислама: акыда, фикх, арабский язык и тафсир.",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: "#031410",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fatiha.ru",
  },
  formatDetection: {
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ru">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${inter.variable} ${playfairDisplay.variable} antialiased min-h-screen flex flex-col`}
        style={{ scrollbarGutter: "stable" }}
      >
        <SessionProvider>
          <OnboardingProvider>
            <ThemeEngine />
            {children}
          </OnboardingProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
