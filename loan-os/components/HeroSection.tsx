"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  Menu,
  X,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";

export default function HeroSection() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [isInputFocus, setIsInputFocus] = useState(false);
  const [showUserNameCheck, setShowUserNameCheck] = useState(false);
  const [userNameAvailable, setUserNameAvailable] = useState(false);
  const [userNameCheckLoading, setUserNameCheckLoading] = useState(false);

  const handleScroll = () => {
    const element = document.getElementById("features-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Simulate username check
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (userName) {
        setUserNameCheckLoading(true);
        setTimeout(() => {
          setUserNameAvailable(userName.length > 3);
          setShowUserNameCheck(true);
          setUserNameCheckLoading(false);
        }, 500);
      } else {
        setShowUserNameCheck(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [userName]);

  return (
    <div className="isolate bg-white min-h-screen">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white [background:radial-gradient(120%_120%_at_50%_10%,#fff_30%,#605f5e_100%)]"></div>
      <div className="absolute h-1/2 -z-10 w-full bg-[radial-gradient(#e5e7eb_1px,transparent_2px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_100%,transparent_100%)]"></div>

      <div className="px-6 pt-6">
        <nav className="flex items-center justify-between" aria-label="Global">
          <div className="flex lg:flex-1 items-center">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="LoanOS Logo"
                width={24}
                height={24}
                className="h-6 w-auto"
              />
              <h4 className="text-gray-900 text-xl font-medium">LoanOS</h4>
            </Link>
          </div>

          <div className="flex lg:hidden gap-4">
            <div className="px-3 py-1 bg-neutral-400 rounded-full cursor-pointer">
              <Link
                href="/signup"
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                Join LoanOS
              </Link>
            </div>
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="hidden lg:flex lg:gap-x-12">
            <Link
              href="#github"
              onClick={handleScroll}
              className="text-sm font-semibold leading-6 text-gray-900 cursor-pointer"
            >
              Github
            </Link>
            <Link
              href="#features"
              onClick={handleScroll}
              className="text-sm font-semibold leading-6 text-gray-900 cursor-pointer"
            >
              Features
            </Link>
            <Link
              href="#status"
              onClick={handleScroll}
              className="text-sm font-semibold leading-6 text-gray-900 cursor-pointer"
            >
              Status
            </Link>
            <Link
              href="#contact"
              className="text-sm font-semibold leading-6 text-gray-900"
            >
              Contact
            </Link>
          </div>

          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <div className="flex gap-4 justify-center items-center">
              <Link
                href="/login"
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                Log in
              </Link>
              <Link href="/signup">
                <div className="px-3 py-0.5 bg-neutral-400 rounded-full cursor-pointer">
                  <p className="text-sm font-semibold leading-6 text-gray-900">
                    Join LoanOS
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/30"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
              <div className="flex items-center justify-between">
                <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
                  <Image
                    src="/logo.svg"
                    alt="LoanOS Logo"
                    width={32}
                    height={32}
                    className="h-8 w-8"
                  />
                  <h4 className="text-gray-900 text-xl font-medium">LoanOS</h4>
                </Link>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-gray-500/10">
                  <div className="space-y-2 py-6">
                    <Link
                      href="#features"
                      onClick={() => {
                        handleScroll();
                        setMobileMenuOpen(false);
                      }}
                      className="-mx-3 block rounded-lg py-2 px-3 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-400/10"
                    >
                      Features
                    </Link>
                    <Link
                      href="#contact"
                      className="-mx-3 block rounded-lg py-2 px-3 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-400/10"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Contact
                    </Link>
                  </div>
                  <div className="py-6">
                    <Link
                      href="/login"
                      className="-mx-3 block rounded-lg py-2.5 px-3 text-base font-semibold leading-6 text-gray-900 hover:bg-gray-400/10"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/signup"
                      className="-mx-3 block rounded-lg py-2.5 px-3 text-base font-semibold leading-6 text-gray-900 hover:bg-gray-400/10"
                    >
                      Join LoanOS
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <main>
        <div className="relative py-24 sm:py-32 lg:pb-40">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-5xl text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                The Fastest Way To Manage
              </h1>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                Your Loan Operations
              </h1>
              <p className="mt-6 text-sm sm:text-lg leading-8 text-gray-600">
                Streamline your loan management at lightning fast speed!
              </p>
            </div>

            <div className="mt-20 flow-root sm:mt-16">
              <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                <div className="aspect-video rounded-md shadow-2xl ring-1 ring-gray-900/10 bg-gray-100 flex items-center justify-center">
                  <div className="text-center text-gray-600"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div id="features-section"></div>
    </div>
  );
}
