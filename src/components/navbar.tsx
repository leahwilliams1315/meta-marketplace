"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const NavBar = () => {
  return (
    <div className="fixed top-0 left-0 right-0 h-24 z-50 px-4">
      <nav className="mx-auto max-w-7xl mt-4 bg-white/70 backdrop-blur-md border border-[#E5E5E5] rounded-full h-14 px-4 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-8">
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
          <SignedOut>
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                className="text-sm text-[#666666] hover:text-[#453E3E] hover:bg-transparent"
              >
                Sign In
              </Button>
            </SignInButton>
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                className="rounded-full bg-[#453E3E] text-white hover:bg-[#453E3E]/90 px-6"
              >
                Get Started
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/create-marketplace">
              <Button
                variant="ghost"
                className="text-sm text-[#666666] hover:text-[#453E3E] hover:bg-transparent"
              >
                Create Marketplace
              </Button>
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
                },
              }}
            />
          </SignedIn>
        </div>
      </nav>
    </div>
  );
};
