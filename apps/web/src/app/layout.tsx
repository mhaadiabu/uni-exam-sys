import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

import "../index.css";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";

import AppShell from "@/components/app-shell";
import Providers from "@/components/providers";
import { cn } from "@uni-exam-sys/ui/lib/utils";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AcademeX - University Exam Management",
  description: "University examination seating arrangement and operations system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(dmSans.variable, mono.variable)}>
      <body className={cn("min-h-screen bg-background font-sans antialiased", dmSans.variable, mono.variable)}>
        <ClerkProvider>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
