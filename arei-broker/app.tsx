import { createContext, useContext, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Nav from "./components/Nav";
import { getBrokerAgencies } from "./brokerData";
import type { BrokerAgency } from "./types";
import InboxPage from "./pages/InboxPage";
import ListingsPage from "./pages/ListingsPage";
import ListingDetailPage from "./pages/ListingDetailPage";
import WebsitePage from "./pages/WebsitePage";
import PerformancePage from "./pages/PerformancePage";
import ProfilePage from "./pages/ProfilePage";

// ── Agency context ────────────────────────────────────────────────────────────

interface AgencyContextValue {
  agency: BrokerAgency | null;
  setAgency: (agency: BrokerAgency) => void;
}

const AgencyContext = createContext<AgencyContextValue>({
  agency: null,
  setAgency: () => undefined,
});

export function useAgency(): AgencyContextValue {
  return useContext(AgencyContext);
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [agency, setAgency] = useState<BrokerAgency | null>(null);
  const [allAgencies, setAllAgencies] = useState<BrokerAgency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBrokerAgencies()
      .then((agencies) => {
        setAllAgencies(agencies);
        if (agencies.length === 0) return;
        // Auto-select demo agency or first
        const demo = agencies.find(
          (a) =>
            a.agency_name.toLowerCase().includes("demo") ||
            a.agency_name.toLowerCase().includes("archipelago")
        );
        setAgency(demo ?? agencies[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const showDemoBar = allAgencies.length > 1;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-background)" }}
      >
        <span style={{ color: "var(--color-foreground-muted)" }}>Loading…</span>
      </div>
    );
  }

  return (
    <AgencyContext.Provider value={{ agency, setAgency }}>
      <BrowserRouter>
        {showDemoBar && (
          <div
            className="flex items-center gap-3 px-4 py-1.5 text-xs"
            style={{
              background: "var(--color-surface-3)",
              borderBottom: "1px solid var(--color-border)",
              color: "var(--color-foreground-muted)",
            }}
          >
            <span>Demo mode — select agency:</span>
            <select
              value={agency?.id ?? ""}
              onChange={(e) => {
                const found = allAgencies.find((a) => a.id === e.target.value);
                if (found) setAgency(found);
              }}
              className="text-xs px-2 py-0.5"
              style={{
                background: "var(--color-surface-1)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
                borderRadius: "4px",
              }}
            >
              {allAgencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.agency_name}
                </option>
              ))}
            </select>
          </div>
        )}
        <Nav />
        {/* pb-16 ensures content clears the fixed bottom tab bar on mobile */}
        <div className="pb-16 sm:pb-0">
          <Routes>
            <Route path="/" element={<InboxPage />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/listings/:id" element={<ListingDetailPage />} />
            <Route path="/website" element={<WebsitePage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AgencyContext.Provider>
  );
}
