import React, { useState } from "react";
import {
  LayoutDashboard,
  Box,
  Search,
  Flame,
  Sparkles,
  Settings,
  ShoppingBag,
  BookOpen,
  Menu,
  LogOut,
  X,
} from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalInHumidor: number;
  userEmail?: string;
  onLogout?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  totalInHumidor,
  userEmail,
  onLogout,
}) => {
  const [altroAperto, setAltroAperto] = useState(false);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "humidor", label: "Humidor", icon: Box, badge: totalInHumidor },
    { id: "prezzi", label: "Prezzi FIT", icon: Search },
    { id: "fumate", label: "Fumate", icon: Flame },
  ];

  // Le schermate meno frequenti stanno nel pannello "Altro": nella barra non c'e' posto per tutte
  const altre = [
    { id: "degustazione", label: "Degustazione", icon: Sparkles },
    { id: "wishlist", label: "Wishlist", icon: ShoppingBag },
    { id: "guida", label: "Guida", icon: BookOpen },
    { id: "impostazioni", label: "Impostazioni", icon: Settings },
  ];
  const altroAttivo = altre.some((t) => t.id === activeTab);

  const vai = (id: string) => {
    setActiveTab(id);
    setAltroAperto(false);
  };

  return (
    <>
      {altroAperto && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setAltroAperto(false)}
        >
          <div
            className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] left-3 right-3 bg-[#181311] border border-[#382b24] rounded-2xl shadow-2xl p-3 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1.5 pb-2">
              <span className="text-xs text-[#8c7e75] truncate">{userEmail ?? "Altro"}</span>
              <button
                onClick={() => setAltroAperto(false)}
                aria-label="Chiudi"
                className="p-1 text-[#8c7e75] hover:text-[#f5ebd9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {altre.map((t) => {
                const Icon = t.icon;
                const attivo = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => vai(t.id)}
                    className={`min-h-[48px] flex items-center gap-2.5 px-3 rounded-xl border text-xs font-medium transition-colors ${
                      attivo
                        ? "bg-[#281f1a] border-[#443328] text-[#c99757]"
                        : "bg-[#140f0e] border-[#261d19] text-[#d8cbbf] hover:border-[#443328]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${attivo ? "text-[#c99757]" : "text-[#7d6f66]"}`} />
                    {t.label}
                  </button>
                );
              })}
            </div>
            {onLogout && (
              <button
                onClick={() => {
                  setAltroAperto(false);
                  onLogout();
                }}
                className="mt-2 w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[#261d19] bg-[#140f0e] text-xs font-medium text-[#a3948b] hover:text-[#f5ebd9]"
              >
                <LogOut className="w-4 h-4" />
                Esci
              </button>
            )}
          </div>
        </div>
      )}

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#16110f]/95 backdrop-blur-lg border-t border-[#2e231e] pb-[calc(env(safe-area-inset-bottom,0px)+6px)] pt-1.5 px-2 shadow-2xl">
        <div className="grid grid-cols-5 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => vai(tab.id)}
                className="min-h-[46px] flex flex-col items-center justify-center relative focus:outline-none py-1"
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? "text-[#c99757] scale-110" : "text-[#7d6f66]"
                    }`}
                  />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 text-[9px] font-mono font-bold leading-none px-1 py-0.5 rounded-full bg-[#c99757] text-[#14100e]">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium tracking-tight mt-1 transition-colors ${
                    isActive ? "text-[#c99757] font-semibold" : "text-[#8c7e75]"
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && <span className="absolute bottom-0 w-6 h-0.5 bg-[#c99757] rounded-full" />}
              </button>
            );
          })}

          <button
            onClick={() => setAltroAperto((v) => !v)}
            aria-expanded={altroAperto}
            className="min-h-[46px] flex flex-col items-center justify-center relative focus:outline-none py-1"
          >
            <Menu
              className={`w-5 h-5 transition-transform ${
                altroAttivo || altroAperto ? "text-[#c99757] scale-110" : "text-[#7d6f66]"
              }`}
            />
            <span
              className={`text-[10px] font-medium tracking-tight mt-1 transition-colors ${
                altroAttivo || altroAperto ? "text-[#c99757] font-semibold" : "text-[#8c7e75]"
              }`}
            >
              Altro
            </span>
            {altroAttivo && <span className="absolute bottom-0 w-6 h-0.5 bg-[#c99757] rounded-full" />}
          </button>
        </div>
      </div>
    </>
  );
};
