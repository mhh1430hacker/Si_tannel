import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "معمل قدرات - Ainex",
  description: "منصة ذكية للتدريب على اختبارات القدرات — ذكاء اصطناعي مدمج، تحليل أداء، بطاقات تعليمية",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-900 text-gray-100 min-h-screen antialiased">
        <AuthProvider>
          <Sidebar>{children}</Sidebar>
        </AuthProvider>
      </body>
    </html>
  );
}
