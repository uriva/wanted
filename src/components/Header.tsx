"use client";

import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center font-black text-white dark:text-black text-base shadow">
              W
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">WANTED</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-700">
                REVERSE MARKETPLACE
              </span>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
