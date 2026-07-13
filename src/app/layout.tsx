import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Set Architect — AI DJ",
  description: "An AI DJ for your Spotify playlists, powered by Claude.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-booth-bg text-booth-text font-display antialiased">{children}</body>
    </html>
  );
}
