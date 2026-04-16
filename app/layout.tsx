import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { getWorkbook } from "@/lib/data/store";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Retailer Analyzer",
  description: "Internal retail real estate analysis workspace",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const wb = await getWorkbook();
  return (
    <html lang="en">
      <body className={cn(inter.variable, "font-sans antialiased bg-muted/30")}>
        <div className="flex min-h-screen">
          <Sidebar workbookMeta={wb ? {
            fileName: wb.fileName,
            parsedAt: wb.parsedAt,
            counts: wb.mappingReport.summary,
          } : null} />
          <main className="flex-1 min-w-0">
            <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
