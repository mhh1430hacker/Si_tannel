import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "أينكس للقدرات | منصة التعليم الذكية",
  description: "أقوى منصة تعليمية للتدريب على اختبارات القدرات باستخدام خوارزميات الذكاء الاصطناعي — تحليل أداء دقيق، بيئة تنافسية، وخطط مخصصة.",
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
    <html lang="ar" dir="rtl" className="scroll-smooth">
      <body className="bg-[#0B0C10] text-gray-100 min-h-screen antialiased selection:bg-indigo-500/30 selection:text-white flex flex-col">
        <ErrorBoundary>
          <AuthProvider>
            <Sidebar>{children}</Sidebar>
          </AuthProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
