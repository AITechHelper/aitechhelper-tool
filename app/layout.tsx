import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ScrollToTopOnRouteChange from "./_components/ScrollToTopOnRouteChange";
import Header from "./_components/Header";
import Footer from "./_components/Footer";
import { ToastProvider } from "./_components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Social Helper",
  description: "AI-powered social media content tailored to your niche.",
  icons: {
    icon: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ToastProvider>
            <ScrollToTopOnRouteChange />
            <Header />
            {children}
            <Footer />
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
