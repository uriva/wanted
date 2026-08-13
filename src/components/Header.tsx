"use client";

export default function Header() {
  return (
    <header className="border-b border-zinc-800 bg-black/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Brand & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-black text-base shadow">
              W
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-tight text-white">WANTED</h1>
                <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                  REVERSE MARKETPLACE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Live Buyer Demand Stream
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
