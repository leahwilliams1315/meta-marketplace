"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export const NavBar = () => {
  return (
    <nav className="flex items-center justify-between w-full py-4 px-6 bg-card border-b border-border shadow-sm">
      <div>
        <Link href="/">
          <h1 className="font-display text-2xl font-bold text-card-foreground tracking-tight">
            MetaMarket
          </h1>
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="btn btn-primary">Sign In</button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  );
};
