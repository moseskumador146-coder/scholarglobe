import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
    "Deep-search verified $0-application scholarships and universities from undergraduate to PhD. English-test waivers for your nationality, language requirements, recommendation rules, transcript policies, deadlines open now and upcoming — mapped on 3 interactive globes.",
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
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
