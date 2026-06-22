import "./globals.css";
import type { Metadata } from "next";
import { AppChrome } from "./components/clinical-ui";

export const metadata: Metadata = {
  title: "Matria",
  description: "Ambient ANC copilot clinical workspace"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
