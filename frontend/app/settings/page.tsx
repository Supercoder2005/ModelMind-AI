import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings — ModelMind AI",
  description: "Configure your ModelMind AI preferences",
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-14 h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <SettingsClient />
        </main>
      </div>
    </div>
  );
}
