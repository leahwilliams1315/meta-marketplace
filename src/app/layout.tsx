import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { CartProvider } from "@/lib/cart";
import { NavBar } from "@/components/navbar";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/lib/providers/query-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "MetaMarket",
  description: "Your Marketplace for Unique Items",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const FixedClerkProvider: React.FC<React.PropsWithChildren<object>> =
    ClerkProvider as unknown as React.FC<React.PropsWithChildren<object>>;
  return (
    <FixedClerkProvider>
      <html lang="en" className="scroll-smooth">
        <body
          className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground font-body`}
        >
          <QueryProvider>
            <CartProvider>
              <NavBar />
              <main className="flex-1 container mx-auto px-6 py-8">
                {children}
              </main>
            </CartProvider>
          </QueryProvider>
        </body>
      </html>
    </FixedClerkProvider>
  );
}
