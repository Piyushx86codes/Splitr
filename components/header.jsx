"use client";
import React from "react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useStoreUser } from "@/hooks/use-store-user";
import { BarLoader } from "react-spinners";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Authenticated, Unauthenticated } from "convex/react";
import { Button } from "./ui/button";
import { LayoutDashboard } from "lucide-react";

const Header = () => {
  const { isLoading } = useStoreUser(); // Fixed typo: isLoading
  const path = usePathname();

  return (
    <div>
      <header className="fixed top-0 w-full border-b bg-white/95 backdrop-blur z-50 supports-backdrop-filter:bg-white/60">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={"/logos/logo11.png"}
              alt="splitr logo"
              width={200}
              height={60}
              loading="eager"
              className="h-11 w-auto object-contain"
            />
          </Link>

          {/* Navigation Links (Landing Page) */}
          {path === "/" && (
            <div className="gap-6 items-center hidden md:flex">
              <Link
                href="#features"
                className="text-sm font-medium hover:text-green-600 transition"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-medium hover:text-green-600 transition"
              >
                How it Works
              </Link>
            </div>
          )}

          {/* Auth Actions */}
          <div className="flex items-center gap-4">
            <Authenticated>
              {/* Dashboard Button */}
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="hidden md:inline-flex items-center gap-2 hover:text-green-600 hover:border-green-600 transition"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>

              {/* Clerk User Avatar / Logout Menu */}
              <UserButton afterSignOutUrl="/" />
            </Authenticated>

            <Unauthenticated>
              <SignInButton mode="modal">
                <Button variant={"ghost"}>Sign In</Button>
              </SignInButton>

              <SignUpButton mode="modal">
                <Button className="bg-green-600 hover:bg-green-700 border-none">
                  Get Started
                </Button>
              </SignUpButton>
            </Unauthenticated>
          </div>
        </nav>

        {/* Loading Bar */}
        {isLoading && <BarLoader width={"100%"} color="#36d7b7" />}
      </header>
    </div>
  );
};

export default Header;