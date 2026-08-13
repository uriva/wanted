"use client";

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between">
          {/* Brand & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                  W
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-tight text-white">WANTED</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                  Reverse Marketplace
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Live Buyer Demand & Intent Stream
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
