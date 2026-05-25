import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "معمل قدرات - Ainex",
  description: "منصة تكيفية لاختبارات القدرات",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 text-gray-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
