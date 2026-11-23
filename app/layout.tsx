import type { Metadata } from "next";
import { Bodoni_Moda } from "next/font/google";
import ContextFile from "@/lib/ContextFile";
import "./globals.css";

const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni-moda",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "votesphere",
  description: "Your votesphere application",
};



export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodoniModa.variable} h-full antialiased`}
    >
      <body className="min-h-full  flex flex-col">
        <ContextFile>{children}</ContextFile>
      </body>
    </html>
  );
}

