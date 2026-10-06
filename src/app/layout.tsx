import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScholarGlobe — Free-Application Scholarships & Universities Worldwide",
  description:
    "Deep-search verified $0-application scholarships and universities from undergraduate to PhD. English-test waivers for your nationality, language requirements, recommendation rules, transcript policies, deadlines open now and upcoming — mapped on 3 interactive globes, with an Apply Co-Pilot that prepares your applications and emails with you.",
  keywords: [
    "scholarships",
    "free application fee",
    "fully funded",
    "masters scholarships",
    "phd funding",
    "undergraduate scholarships",
    "IELTS waiver",
    "MOI certificate",
    "Ghana scholarships",
    "apply co-pilot",
    "application tracker",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fd" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1126" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
