import { ClerkProvider } from "@clerk/nextjs";
import { NavBar } from "@/components/navbar";
import "./globals.css"; // or wherever your tailwind styles are

export const metadata = {
  title: "MetaMarket",
  description: "Multi-marketplace platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ClerkProvider>
        <body className="min-h-screen flex flex-col">
          {/* Shared top nav for the entire site */}
          <NavBar />
          {/* Main content area */}
          <main className="flex-1">{children}</main>
        </body>
      </ClerkProvider>
    </html>
  );
}
