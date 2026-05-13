import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType = "lead" | "overdue" | "listing" | "viewing";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** ISO date — used for grouping. Display label is derived. */
  createdAt: string;
  read: boolean;
  /** Optional internal route to deep-link from the notification */
  link?: string;
}

// ── Mock dataset ──────────────────────────────────────────────────────────────
// Larger than the dropdown so we can demo paging / "See all".

function isoMinutesAgo(min: number): string {
  return new Date(Date.now() - min * 60 * 1000).toISOString();
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n01",
    type: "lead",
    title: "New lead",
    body: "João Silva enquired about Casa da Luz",
    createdAt: isoMinutesAgo(10),
    read: false,
    link: "/leads",
  },
  {
    id: "n02",
    type: "overdue",
    title: "Follow-up overdue",
    body: "Maria Santos — was due yesterday",
    createdAt: isoMinutesAgo(60),
    read: false,
    link: "/leads",
  },
  {
    id: "n03",
    type: "viewing",
    title: "Viewing confirmed",
    body: "Apt 3B, Mindelo — tomorrow 10:00",
    createdAt: isoMinutesAgo(60 * 3),
    read: true,
  },
  {
    id: "n04",
    type: "listing",
    title: "Listing approved",
    body: "Moradia T3, São Vicente is now live",
    createdAt: isoMinutesAgo(60 * 26),
    read: true,
    link: "/listings",
  },
  {
    id: "n05",
    type: "lead",
    title: "New lead",
    body: "Sofia Andrade requested a viewing for 2BR Apartment, Mindelo",
    createdAt: isoMinutesAgo(60 * 28),
    read: false,
    link: "/leads",
  },
  {
    id: "n06",
    type: "lead",
    title: "New lead",
    body: "Marco Bianchi enquired about 3BR Villa, Sal",
    createdAt: isoMinutesAgo(60 * 30),
    read: true,
    link: "/leads",
  },
  {
    id: "n07",
    type: "overdue",
    title: "Follow-up overdue",
    body: "João Silva — was due 2 days ago",
    createdAt: isoMinutesAgo(60 * 48),
    read: true,
    link: "/leads",
  },
  {
    id: "n08",
    type: "viewing",
    title: "Viewing rescheduled",
    body: "Land plot, Boavista — moved to Mon 19 May 11:00",
    createdAt: isoMinutesAgo(60 * 52),
    read: true,
  },
  {
    id: "n09",
    type: "listing",
    title: "Listing needs review",
    body: "Apartment T2, Santiago — missing 3 photos",
    createdAt: isoMinutesAgo(60 * 70),
    read: true,
    link: "/listings",
  },
  {
    id: "n10",
    type: "lead",
    title: "New lead",
    body: "Anna Müller enquired about Moradia T3, São Vicente",
    createdAt: isoMinutesAgo(60 * 96),
    read: true,
    link: "/leads",
  },
  {
    id: "n11",
    type: "listing",
    title: "Listing published",
    body: "Beachfront studio, Sal is now live on your agency page",
    createdAt: isoMinutesAgo(60 * 120),
    read: true,
    link: "/listings",
  },
  {
    id: "n12",
    type: "viewing",
    title: "Viewing completed",
    body: "Marco Bianchi visited 3BR Villa, Sal — add notes",
    createdAt: isoMinutesAgo(60 * 168),
    read: true,
    link: "/leads",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compact relative time for dropdown / list rows */
export function relativeTime(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Coarse age bucket used for grouping on the full notifications page */
export function ageBucket(iso: string): "today" | "yesterday" | "this_week" | "earlier" {
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return "today";
  if (diffMs < day * 2) return "yesterday";
  if (diffMs < day * 7) return "this_week";
  return "earlier";
}

// ── Context ───────────────────────────────────────────────────────────────────

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
