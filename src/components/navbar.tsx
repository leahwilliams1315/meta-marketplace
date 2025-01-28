"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export const NavBar = () => {
  return (
    <nav className="flex items-center justify-between w-full py-4 px-6 bg-gray-50 border-b border-gray-200">
      <div>
        <Link href="/">
          <h1 className="font-bold text-xl tracking-tight">MetaMarket</h1>
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        {/* SignedOut = only show these when user is logged out */}
        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">
              Sign In
            </button>
          </SignInButton>
          {/* 
            If you also want a "Sign Up" button, use <SignUpButton> similarly.
            e.g.:

            <SignUpButton mode="modal">
              <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded">
                Sign Up
              </button>
            </SignUpButton>
          */}
        </SignedOut>

        {/* SignedIn = only show these when user is logged in */}
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  );
};
