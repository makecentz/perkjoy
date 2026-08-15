import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const body = DM_Sans({ variable: "--font-body", subsets: ["latin"] });
const display = Manrope({ variable: "--font-display", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;
  const description = "PerkJoy remembers employee birthdays, anniversaries, accomplishments, and life moments—then personalizes and helps deliver the celebration.";
  return {
    title: { default: "PerkJoy — Employee celebrations on autopilot", template: "%s | PerkJoy" },
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title: "Never miss a moment worth celebrating.", description, type: "website", images: [{ url: imageUrl, width: 1200, height: 630, alt: "PerkJoy employee celebration automation" }] },
    twitter: { card: "summary_large_image", title: "Never miss a moment worth celebrating.", description, images: [imageUrl] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('perkjoy-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()` }} /></head>
      <body className={`${body.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
