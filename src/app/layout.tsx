import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientSafetyWrapper from "@/components/ClientSafetyWrapper";

export const metadata: Metadata = {
  title: "ANVESHIPIN KANDETHUM | PADAKALAM 2.0",
  description: "Official real-world team treasure hunt mission portal. Mobile-first live expedition.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#070a11",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070a11] text-slate-100 antialiased min-h-screen selection:bg-amber-500 selection:text-black">
        <ClientSafetyWrapper>{children}</ClientSafetyWrapper>
      </body>
    </html>
  );
}
