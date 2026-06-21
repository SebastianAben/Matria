import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Matria",
  description: "Ambient ANC copilot clinical workspace"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <p className="brand">Matria</p>
            <nav className="nav" aria-label="Primary">
              <Link href="/workspace">Workspace</Link>
              <Link href="/patients">Patients</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/login">Login</Link>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
