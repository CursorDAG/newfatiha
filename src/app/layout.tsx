import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Navbar from "@/components/Navbar";
import { SessionProvider } from "@/components/SessionProvider";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  themeColor: "#059669",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-slate-50`}
      >
        <SessionProvider>
          <OnboardingProvider>
            <Navbar userName={session?.user?.name} role={session?.user?.role} />
            <div className="flex-1 flex flex-col items-stretch justify-start">
              {children}
            </div>
          </OnboardingProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
