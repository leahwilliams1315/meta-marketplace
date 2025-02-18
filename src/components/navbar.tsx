"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { CartDropdown } from "@/components/CartDropdown";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const FixedSignedIn: React.FC<React.PropsWithChildren<object>> =
  SignedIn as unknown as React.FC<React.PropsWithChildren<object>>;
const FixedSignedOut: React.FC<React.PropsWithChildren<object>> =
  SignedOut as unknown as React.FC<React.PropsWithChildren<object>>;
const FixedSignInButton: React.FC<React.PropsWithChildren<{ mode: "modal" }>> =
  SignInButton as unknown as React.FC<
    React.PropsWithChildren<{ mode: "modal" }>
  >;
const FixedUserButton: React.FC<{
  afterSignOutUrl: string;
  appearance: object;
}> = UserButton as unknown as React.FC<{
  afterSignOutUrl: string;
  appearance: object;
}>;

export const NavBar = () => {
  return (
    <div className="fixed top-0 left-0 right-0 h-24 z-50 px-4">
      <nav className="mx-auto max-w-[1100px] mt-4 bg-white/70 backdrop-blur-md border border-[#E5E5E5] rounded-full h-14 px-4 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-8">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-transparent"
                >
                  <Menu className="h-5 w-5 text-[#666666]" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] p-0 bg-white/95 backdrop-blur-md border-[#E5E5E5]"
              >
                <div className="h-24 flex items-center justify-between px-8">
                  <SheetTitle asChild>
                    <Link href="/" className="flex items-center mt-4">
                      <h1 className="font-display text-2xl font-bold tracking-tight text-[#453E3E]">
                        MetaMarket
                      </h1>
                    </Link>
                  </SheetTitle>
                </div>
                <div className="h-[1px] bg-[#E5E5E5]" />
                <div className="px-6 py-6">
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/marketplaces"
                      className="text-sm font-medium text-[#666666] hover:text-[#453E3E] transition-colors px-3 py-2 rounded-md hover:bg-[#faf9f7]"
                    >
                      Browse
                    </Link>
                    <Link
                      href="/dashboard"
                      className="text-sm font-medium text-[#666666] hover:text-[#453E3E] transition-colors px-3 py-2 rounded-md hover:bg-[#faf9f7]"
                    >
                      Dashboard
                    </Link>
                    <FixedSignedIn>
                      <Link
                        href="/create-marketplace"
                        className="text-sm font-medium text-[#666666] hover:text-[#453E3E] transition-colors px-3 py-2 rounded-md hover:bg-[#faf9f7]"
                      >
                        Create Marketplace
                      </Link>
                    </FixedSignedIn>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <Link href="/" className="flex items-center">
            <h1 className="font-display text-xl font-bold text-[#453E3E]">
              MetaMarket
            </h1>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/marketplaces"
              className="text-sm text-[#666666] hover:text-[#453E3E] transition-colors"
            >
              Browse
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-[#666666] hover:text-[#453E3E] transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FixedSignedOut>
            <FixedSignInButton mode="modal">
              <Button
                variant="ghost"
                className="text-sm text-[#666666] hover:text-[#453E3E] hover:bg-transparent"
              >
                Sign In
              </Button>
            </FixedSignInButton>
            <FixedSignInButton mode="modal">
              <Button
                variant="ghost"
                className="rounded-full bg-[#453E3E] text-white hover:bg-[#453E3E]/90 px-6"
              >
                Get Started
              </Button>
            </FixedSignInButton>
          </FixedSignedOut>
          <FixedSignedIn>
            <Link href="/create-marketplace" className="hidden md:block">
              <Button
                variant="ghost"
                className="text-sm text-[#666666] hover:text-[#453E3E] hover:bg-transparent"
              >
                Create Marketplace
              </Button>
            </Link>
            <CartDropdown />
            <FixedUserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
                },
              }}
            />
          </FixedSignedIn>
        </div>
      </nav>
    </div>
  );
};
