import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import { Toaster } from "sonner";
import { PipelineSchemasProvider } from "@/context/PipelineSchemasContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenScope - Visual Plugin Builder",
  description: "Build Scope plugins visually with nodes",
};

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={raleway.variable}>
      <body className="font-sans antialiased">
        <PipelineSchemasProvider>
          {children}
        </PipelineSchemasProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
