import type { Metadata } from "next";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compass",
  description:
    "Cancer care navigation for patients, caregivers and care navigators.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AuthBootstrap />
        {children}
      </body>
    </html>
  );
}
