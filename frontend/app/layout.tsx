import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ModelMind AI — Automated ML Analysis",
  description:
    "Upload any CSV and get instant AI-powered insights. Auto EDA, multi-model battle, natural language explanations, and Jupyter export — powered by Advanced AI.",
  keywords: ["machine learning", "AI", "data analysis", "AutoML", "Explainable AI"],
  openGraph: {
    title: "ModelMind AI",
    description: "Upload a CSV. Get ML superpowers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
