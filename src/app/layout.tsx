import { ClerkProvider } from "@clerk/nextjs";
import { NavBar } from "@/components/navbar";
import "./globals.css";

export const metadata = {
  title: "MetaMarket",
  description:
    "A meta marketplace for artisans to connect, collaborate, and create.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <ClerkProvider>
        <body className="min-h-screen flex flex-col bg-background text-foreground font-body">
          <NavBar />
          <main className="flex-1 container mx-auto px-6 py-8">{children}</main>
        </body>
      </ClerkProvider>
    </html>
  );
}
