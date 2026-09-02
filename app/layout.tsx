import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "واصل - منصة إدارة علاقات العملاء",
  description: "منصة واصل لإدارة علاقات العملاء والفرص البيعية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
