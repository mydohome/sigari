import React, { useCallback, useEffect, useRef, useState } from "react";
import { Navbar } from "./components/Navbar";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { AuthScreen } from "./components/AuthScreen";
import { DashboardTab } from "./components/DashboardTab";
import { HumidorTab } from "./components/HumidorTab";
import { PricesTab } from "./components/PricesTab";
import { FumateTab } from "./components/FumateTab";
import { TastingNotesTab } from "./components/TastingNotesTab";
import { WishlistTab } from "./components/WishlistTab";
import { WikiTab } from "./components/WikiTab";
import { SettingsTab } from "./components/SettingsTab";
import { FumataModal } from "./components/modals/FumataModal";
import { PurchaseModal } from "./components/modals/PurchaseModal";
import { PriceHistoryModal } from "./components/modals/PriceHistoryModal";
import { AIReviewModal } from "./components/modals/AIReviewModal";
import { EditHumidorItemModal } from "./components/modals/EditHumidorItemModal";
import * as api from "./lib/api";
import type {
  Favorite,
  Fumata,
  HumidorItem,
  HumidorLocation,
  HumidorShop,
  HumidorStats,
  PriceHistoryPoint,
  Product,
  TastingReview,
  WishlistItem,
} from "./types/cigar";

function messaggioErrore(err: unknown): string {
  return err instanceof Error ? err.message : "Operazione non riuscita.";
}

export default function App() {
  const [user, setUser] = useState<api.AuthUser | null>(api.getStoredUser());
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Dati dell'utente
  const [humidorItems, setHumidorItems] = useState<HumidorItem[]>([]);
  const [locations, setLocations] = useState<HumidorLocation[]>([]);
  const [shops, setShops] = useState<HumidorShop[]>([]);
  const [fumate, setFumate] = useState<Fumata[]>([]);
  const [reviews, setReviews] = useState<Record<number, TastingReview>>({});
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [stats, setStats] = useState<HumidorStats | null>(null);
  // Cambia a ogni modifica di preferiti/wishlist/humidor: la ricerca prezzi si riaggiorna
  const [listinoVersion, setListinoVersion] = useState(0);

  // Modali
  const [isFumataModalOpen, setIsFumataModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAIReviewModalOpen, setIsAIReviewModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);

  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [productHistoryPoints, setProductHistoryPoints] = useState<PriceHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedProductForAIReview, setSelectedProductForAIReview] = useState<Product | null>(null);
  const [preSelectedProductForPurchase, setPreSelectedProductForPurchase] = useState<Product | null>(null);
  const [preSelectedQuantityForPurchase, setPreSelectedQuantityForPurchase] = useState<number | undefined>(undefined);
  const [preSelectedItemForFumata, setPreSelectedItemForFumata] = useState<HumidorItem | null>(null);
  const [editingHumidorItem, setEditingHumidorItem] = useState<HumidorItem | null>(null);
  const [editingFumata, setEditingFumata] = useState<Fumata | null>(null);
  const [tastingProduct, setTastingProduct] = useState<Product | null>(null);

  // Notifica a comparsa
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Esegue un'azione e mostra l'esito: l'errore del server appare nella notifica
  const esegui = useCallback(
    async (azione: () => Promise<unknown>, messaggioOk?: string): Promise<boolean> => {
      try {
        await azione();
        if (messaggioOk) showToast(messaggioOk);
        return true;
      } catch (err) {
        showToast(messaggioErrore(err));
        return false;
      }
    },
    [showToast]
  );

  const loadData = useCallback(async () => {
    try {
      const [lotti, locs, tabaccherie, fum, schede, stat, pref, wish] = await Promise.all([
        api.fetchLotti(),
        api.fetchLocations(),
        api.fetchTabaccherie(),
        api.fetchFumate(500),
        api.fetchSchede(),
        api.fetchStatistiche(),
        api.fetchPreferiti(),
        api.fetchWishlist(),
      ]);
      setHumidorItems(lotti);
      setLocations(locs);
      setShops(tabaccherie);
      setFumate(fum);
      setReviews(schede);
      setStats(stat);
      setFavorites(pref);
      setWishlist(wish);
      setListinoVersion((v) => v + 1);
    } catch (err) {
      showToast(messaggioErrore(err));
    }
  }, [showToast]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Sessione scaduta o non valida: si torna alla schermata di accesso
  useEffect(() => {
    const scaduta = () => setUser(null);
    window.addEventListener("sigari:sessione-scaduta", scaduta);
    return () => window.removeEventListener("sigari:sessione-scaduta", scaduta);
  }, []);

  const handleLogin = (token: string, utente: api.AuthUser) => {
    api.saveSession(token, utente);
    setUser(utente);
  };

  const handleLogout = () => {
    api.clearSession();
    setUser(null);
    setActiveTab("dashboard");
    setStats(null);
    setHumidorItems([]);
    setFumate([]);
  };

  // --- Fumate ---
  const handleFumataSubmit = async (data: Record<string, unknown>): Promise<boolean> => {
    const ok = await esegui(() => api.registraFumata(data), "Fumata registrata nel diario!");
    if (ok) await loadData();
    return ok;
  };

  const handleDeleteFumata = async (id: number) => {
    if (!window.confirm("Annullare questa fumata? I sigari tornano in humidor.")) return;
    if (await esegui(() => api.annullaFumata(id), "Fumata annullata: scorta ripristinata in humidor.")) {
      await loadData();
    }
  };

  const handleUpdateFumata = async (id: number, data: Record<string, unknown>): Promise<boolean> => {
    const ok = await esegui(() => api.modificaFumata(id, data), "Fumata modificata con successo!");
    if (ok) await loadData();
    return ok;
  };

  // --- Humidor ---
  const handlePurchaseSubmit = async (data: api.NuovoLotto): Promise<boolean> => {
    const ok = await esegui(() => api.aggiungiLotto(data), "Sigari aggiunti all'inventario!");
    if (ok) await loadData();
    return ok;
  };

  const handleDeleteHumidorItem = async (id: number) => {
    if (!window.confirm("Rimuovere questo lotto dall'humidor?")) return;
    if (await esegui(() => api.eliminaLotto(id), "Lotto rimosso dall'humidor.")) await loadData();
  };

  const handleUpdateHumidorItem = async (id: number, data: Record<string, unknown>): Promise<boolean> => {
    const ok = await esegui(() => api.modificaLotto(id, data), "Sigaro in humidor aggiornato con successo!");
    if (ok) await loadData();
    return ok;
  };

  const handleUpdateItemQuantity = async (id: number, quantita_rimanente: number) => {
    if (await esegui(() => api.modificaLotto(id, { quantita_rimanente }))) await loadData();
  };

  const handleMoveLocation = async (id: number, location_id: number) => {
    if (await esegui(() => api.modificaLotto(id, { location_id }), "Sigari spostati nella nuova location.")) {
      await loadData();
    }
  };

  // --- Storico prezzi ---
  const handleOpenHistoryModal = async (product: Product) => {
    setSelectedProductForHistory(product);
    setProductHistoryPoints([]);
    setHistoryLoading(true);
    setIsHistoryModalOpen(true);
    try {
      setProductHistoryPoints(await api.fetchStoricoPrezzi(product.id, 5));
    } catch (err) {
      showToast(messaggioErrore(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  // --- Schede di degustazione ---
  const handleSaveReview = async (productId: number, data: Record<string, unknown>): Promise<boolean> => {
    const ok = await esegui(() => api.salvaScheda(productId, data), "Scheda sensoriale salvata!");
    if (ok) setReviews(await api.fetchSchede());
    return ok;
  };

  // --- Preferiti e wishlist ---
  const handleToggleFavorite = async (product: Product) => {
    const isFav = favorites.some((f) => f.product_id === product.id) || Boolean(product.is_preferito);
    const ok = isFav
      ? await esegui(() => api.rimuoviPreferito(product.id), "Rimosso dai preferiti.")
      : await esegui(() => api.aggiungiPreferito(product.id, "Da riprovare"), "Aggiunto ai preferiti!");
    if (ok) await loadData();
  };

  const handleUpdateFavoriteTag = async (productId: number, tag: string) => {
    if (await esegui(() => api.aggiornaTagPreferito(productId, tag), "Tag preferito aggiornato.")) {
      setFavorites((prev) => prev.map((f) => (f.product_id === productId ? { ...f, tag } : f)));
    }
  };

  const handleAddToWishlist = async (product: Product) => {
    if (await esegui(() => api.aggiungiAllaWishlist(product.id, 1), `${product.marca} aggiunto alla wishlist!`)) {
      await loadData();
    }
  };

  const handleUpdateWishlistQty = async (productId: number, quantita: number) => {
    if (await esegui(() => api.aggiornaQuantitaWishlist(productId, quantita))) await loadData();
  };

  const handleRemoveFromWishlist = async (productId: number) => {
    if (await esegui(() => api.rimuoviDallaWishlist(productId), "Rimosso dalla wishlist.")) await loadData();
  };

  // Dalla wishlist (che conta le confezioni) all'acquisto (che conta i sigari singoli)
  const handleTransferWishlistToHumidor = (product: Product, confezioni = 1) => {
    setPreSelectedProductForPurchase(product);
    setPreSelectedQuantityForPurchase(confezioni * (product.pezzi_per_confezione ?? 1));
    setIsPurchaseModalOpen(true);
  };

  const totalInHumidor = humidorItems.reduce((s, i) => s + i.quantita_rimanente, 0);

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#120f0e] text-[#f2ece4] flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenFumataModal={() => {
          setPreSelectedProductForPurchase(null);
          setPreSelectedItemForFumata(null);
          setEditingFumata(null);
          setIsFumataModalOpen(true);
        }}
        onOpenPurchaseModal={() => {
          setPreSelectedProductForPurchase(null);
          setIsPurchaseModalOpen(true);
        }}
        totalInHumidor={totalInHumidor}
        userEmail={user.email}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pt-6">
        {activeTab === "dashboard" && (
          <DashboardTab
            stats={stats}
            fumate={fumate}
            onOpenFumataModal={() => {
              setEditingFumata(null);
              setPreSelectedItemForFumata(null);
              setIsFumataModalOpen(true);
            }}
            onOpenPurchaseModal={() => {
              setPreSelectedProductForPurchase(null);
              setIsPurchaseModalOpen(true);
            }}
            onNavigateToHumidor={() => setActiveTab("humidor")}
          />
        )}

        {activeTab === "humidor" && (
          <HumidorTab
            items={humidorItems}
            locations={locations}
            onOpenPurchaseModal={() => {
              setPreSelectedProductForPurchase(null);
              setIsPurchaseModalOpen(true);
            }}
            onOpenFumataForProduct={(item) => {
              setPreSelectedItemForFumata(item);
              setEditingFumata(null);
              setIsFumataModalOpen(true);
            }}
            onOpenTastingNote={(product) => {
              setTastingProduct(product);
              setActiveTab("degustazione");
            }}
            onOpenEditItem={(item) => {
              setEditingHumidorItem(item);
              setIsEditItemModalOpen(true);
            }}
            onDeleteItem={handleDeleteHumidorItem}
            onUpdateQuantity={handleUpdateItemQuantity}
            onMoveLocation={handleMoveLocation}
          />
        )}

        {activeTab === "prezzi" && (
          <PricesTab
            refreshKey={listinoVersion}
            onOpenHistoryModal={handleOpenHistoryModal}
            onOpenPurchaseModalWithProduct={(product) => {
              setPreSelectedProductForPurchase(product);
              setIsPurchaseModalOpen(true);
            }}
            onToggleFavorite={handleToggleFavorite}
            onAddToWishlist={handleAddToWishlist}
            onOpenAIReview={(product) => {
              setSelectedProductForAIReview(product);
              setIsAIReviewModalOpen(true);
            }}
          />
        )}

        {activeTab === "fumate" && (
          <FumateTab
            fumate={fumate}
            stats={stats}
            onOpenFumataModal={() => {
              setEditingFumata(null);
              setPreSelectedItemForFumata(null);
              setIsFumataModalOpen(true);
            }}
            onOpenEditFumata={(fum) => {
              setEditingFumata(fum);
              setIsFumataModalOpen(true);
            }}
            onDeleteFumata={handleDeleteFumata}
          />
        )}

        {activeTab === "degustazione" && (
          <TastingNotesTab
            reviews={reviews}
            initialProduct={tastingProduct}
            onInitialProductHandled={() => setTastingProduct(null)}
            onSaveReview={handleSaveReview}
            onOpenAIReview={(product) => {
              setSelectedProductForAIReview(product);
              setIsAIReviewModalOpen(true);
            }}
          />
        )}

        {activeTab === "wishlist" && (
          <WishlistTab
            wishlist={wishlist}
            favorites={favorites}
            onUpdateWishlistQty={handleUpdateWishlistQty}
            onRemoveFromWishlist={handleRemoveFromWishlist}
            onRemoveFromFavorites={(productId) => {
              const fav = favorites.find((f) => f.product_id === productId);
              if (fav?.product) handleToggleFavorite(fav.product);
            }}
            onTransferToHumidor={handleTransferWishlistToHumidor}
            onUpdateFavoriteTag={handleUpdateFavoriteTag}
          />
        )}

        {activeTab === "guida" && <WikiTab />}

        {activeTab === "impostazioni" && (
          <SettingsTab
            locations={locations}
            userEmail={user.email}
            onRefreshData={loadData}
            onLogout={handleLogout}
            notify={showToast}
          />
        )}
      </main>

      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalInHumidor={totalInHumidor}
        userEmail={user.email}
        onLogout={handleLogout}
      />

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 lg:bottom-6 right-6 z-50 bg-[#281f1a] text-[#f5ebd9] border border-[#c99757] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in"
        >
          <span className="w-2 h-2 rounded-full bg-[#c99757]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <FumataModal
        isOpen={isFumataModalOpen}
        onClose={() => {
          setIsFumataModalOpen(false);
          setPreSelectedItemForFumata(null);
          setEditingFumata(null);
        }}
        humidorItems={humidorItems}
        preSelectedItem={preSelectedItemForFumata}
        editingFumata={editingFumata}
        onUpdate={handleUpdateFumata}
        onSubmit={handleFumataSubmit}
      />

      <EditHumidorItemModal
        isOpen={isEditItemModalOpen}
        onClose={() => {
          setIsEditItemModalOpen(false);
          setEditingHumidorItem(null);
        }}
        item={editingHumidorItem}
        locations={locations}
        shops={shops}
        onSubmit={handleUpdateHumidorItem}
      />

      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setPreSelectedProductForPurchase(null);
          setPreSelectedQuantityForPurchase(undefined);
        }}
        locations={locations}
        shops={shops}
        preSelectedProduct={preSelectedProductForPurchase}
        preSelectedQuantity={preSelectedQuantityForPurchase}
        onSubmit={handlePurchaseSubmit}
      />

      <PriceHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedProductForHistory(null);
        }}
        product={selectedProductForHistory}
        history={productHistoryPoints}
        loading={historyLoading}
      />

      <AIReviewModal
        isOpen={isAIReviewModalOpen}
        onClose={() => {
          setIsAIReviewModalOpen(false);
          setSelectedProductForAIReview(null);
        }}
        product={selectedProductForAIReview}
      />
    </div>
  );
}
