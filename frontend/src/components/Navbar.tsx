import React from "react";
import { LayoutDashboard, Box, Search, Flame, BookOpen, Settings, Sparkles, ShoppingBag, Plus, LogOut } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenFumataModal: () => void;
  onOpenPurchaseModal: () => void;
  totalInHumidor: number;
  userEmail?: string;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenFumataModal,
  onOpenPurchaseModal,
  totalInHumidor,
  userEmail,
  onLogout,
}) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "humidor", label: "Humidor", icon: Box, badge: totalInHumidor },
    { id: "prezzi", label: "Prezzi FIT", icon: Search },
    { id: "fumate", label: "Fumate", icon: Flame },
    { id: "degustazione", label: "Degustazione", icon: Sparkles },
    { id: "wishlist", label: "Wishlist", icon: ShoppingBag },
    { id: "guida", label: "Guida", icon: BookOpen },
    { id: "impostazioni", label: "Impostazioni", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#14100e]/95 backdrop-blur-md border-b border-[#2e231e] px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand title */}
        <button
          onClick={() => setActiveTab("dashboard")}
          className="flex items-center gap-3 text-left focus:outline-none group shrink-0"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#c99757] to-[#8b5e34] p-0.5 shadow-md shadow-black/40">
            <div className="w-full h-full bg-[#171210] rounded-[7px] flex items-center justify-center text-[#c99757]">
              <Flame className="w-5 h-5 text-[#c99757] group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="font-serif tracking-wider text-base lg:text-lg font-bold text-[#f5ebd9] flex items-center gap-2">
              SIGARI TRACK
            </div>
          </div>
        </button>

        {/* Zone 2: Navigation Links (single-line, clean typography) */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-[#281f1a] text-[#c99757] border border-[#443328]"
                    : "text-[#a3948b] hover:text-[#f5ebd9] hover:bg-[#1f1714]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#c99757]" : "text-[#7d6f66]"}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-[10px] tabular-nums font-mono px-1.5 py-0.2 rounded bg-[#3a2c24] text-[#e0b987]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenFumataModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#f5ebd9] bg-[#2a1e18] hover:bg-[#362720] border border-[#4d382d] rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0 active:scale-95"
          >
            <Flame className="w-3.5 h-3.5 text-[#c99757]" />
            <span>Registra Fumata</span>
          </button>
          <button
            onClick={onOpenPurchaseModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-lg transition-all shadow-md shadow-[#b37d3e]/20 whitespace-nowrap shrink-0 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-[#14100e] stroke-[2.5]" />
            <span>Aggiungi Sigaro</span>
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              title={userEmail ? `Esci (${userEmail})` : "Esci"}
              aria-label="Esci"
              className="hidden lg:inline-flex items-center justify-center w-8 h-8 text-[#8c7e75] hover:text-[#f5ebd9] hover:bg-[#1f1714] rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
