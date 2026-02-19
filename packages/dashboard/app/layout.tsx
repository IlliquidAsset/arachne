"use client";

import { Suspense } from "react";
import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { authProvider } from "./providers/auth-provider";
import { dataProvider } from "./providers/data-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <Refine
            routerProvider={routerProvider}
            dataProvider={{ default: dataProvider }}
            authProvider={authProvider}
            resources={[{ name: "dashboard", list: "/dashboard" }]}
          >
            {children}
          </Refine>
        </Suspense>
      </body>
    </html>
  );
}
