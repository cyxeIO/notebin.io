"use client";

import React, { useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import Link from "next/link";
import { MenuIcon, XIcon } from "lucide-react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-muted">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold tracking-tight">
          BlockNostr
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/snippets" className="text-sm font-medium hover:text-primary transition-colors">
            Snippets
          </Link>
          <Link href="/profile" className="text-sm font-medium hover:text-primary transition-colors">
            Profile
          </Link>
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Login
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <Menu as="div" className="md:hidden relative">
          <Menu.Button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md hover:bg-muted focus:outline-none"
          >
            {isOpen ? (
              <XIcon className="w-6 h-6" aria-hidden="true" />
            ) : (
              <MenuIcon className="w-6 h-6" aria-hidden="true" />
            )}
          </Menu.Button>

          {/* Mobile Menu */}
          <Transition
            show={isOpen}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-background border border-muted rounded-md shadow-lg p-2 focus:outline-none">
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/snippets"
                    className={`block px-4 py-2 text-sm ${active ? "bg-muted text-primary" : "text-foreground"} rounded-md`}
                    onClick={() => setIsOpen(false)}
                  >
                    Snippets
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/profile"
                    className={`block px-4 py-2 text-sm ${active ? "bg-muted text-primary" : "text-foreground"} rounded-md`}
                    onClick={() => setIsOpen(false)}
                  >
                    Profile
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/login"
                    className={`block px-4 py-2 text-sm ${active ? "bg-muted text-primary" : "text-foreground"} rounded-md`}
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
}