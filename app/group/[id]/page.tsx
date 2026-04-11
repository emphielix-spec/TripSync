"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import ReactMarkdown from "react-markdown";
import DestinationImage from "@/app/components/DestinationImage";

// ─── Types ────────────────────────────────────────────────
type Tab = "preferences" | "match" | "results" | "split";
type AsyncStatus = "idle" | "loading" | "success" | "error";

const VIBES = ["BEACH", "CITY", "NATURE", "PARTY", "CULTURE", "ADVENTURE"] as const;
type Vibe = (typeof VIBES)[number];

const VIBE_LABELS: Record<Vibe, string> = {
  BEACH: "🏖️ Beach",
  CITY: "🏙️ City",
  NATURE: "🌲 Nature",
  PARTY: "🎉 Party",
  CULTURE: "🏛️ Culture",
  ADVENTURE: "⛰️ Adventure",
};

const YES_NO_QUESTIONS = [
  { key: "wantsBeach",        label: "Do you want a beach holiday?" },
  { key: "wantsNightlife",    label: "Do you want nightlife / going out?" },
  { key: "okLongFlights",     label: "Are you okay with long flights? (4+ hours)" },
  { key: "wantsOutdoor",      label: "Do you want outdoor activities? (hiking, watersports etc.)" },
  { key: "prefersCity",       label: "Do you prefer a city over nature?" },
  { key: "budgetPriority",    label: "Is budget the most important factor for you?" },
  { key: "wantsRoadTrip",     label: "Would you consider a road trip style holiday?" },
  { key: "wantsWarmWeather",  label: "Do you want warm weather? (25°C+)" },
  { key: "openToOffbeat",     label: "Are you open to visiting a less touristy destination?" },
  { key: "wantsAllInclusive", label: "Do you want all-inclusive or resort style?" },
] as const;

type YesNoKey = (typeof YES_NO_QUESTIONS)[number]["key"];

const CURRENCIES = [
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "USD", symbol: "$" },
  { code: "SEK", symbol: "kr" },
  { code: "NOK", symbol: "kr" },
  { code: "CHF", symbol: "Fr" },
] as const;
type CurrencyCode = (typeof CURRENCIES)[number]["code"];

interface GroupMember {
  id: string;
  name: string;
  hasPreferences: boolean;
}

interface Destination {
  id: string;
  name: string;
  country: string;
  reasoning: string;
  score: number;
}

interface DestinationResult extends Destination {
  upvotes: number;
  downvotes: number;
  createdAt: string;
}

interface SplitEntry {
  id?: string;
  label: string;
  totalAmount: number;
  memberCount: number;
  amountPerPerson: number;
}

interface PrefSummaryEntry {
  memberName: string;
  budgetMin: number;
  budgetMax: number;
  departureDateFrom: string;
  departureDateTo: string;
  tripDurationDays: number;
  vibe: string;
  questions: { key: string; label: string; answer: boolean }[];
}

// ─── Animation variants ───────────────────────────────────────
const tabVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

const cardContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

// Returns the index of the destination with the highest net votes (upvotes - downvotes)
// Falls back to index 0 if no votes yet
function getBestDestIdx(dests: { id: string }[], voted: Record<string, "UP" | "DOWN">): number {
  if (dests.length === 0) return 0;
  let best = 0;
  let bestNet = -Infinity;
  for (let i = 0; i < dests.length; i++) {
    const v = voted[dests[i].id];
    const net = v === "UP" ? 1 : v === "DOWN" ? -1 : 0;
    if (net > bestNet) { bestNet = net; best = i; }
  }
  return best;
}

// ─── Component ────────────────────────────────────────────────
export default function GroupPage({ params }: { params: { id: string } }) {
  const groupId = params.id;
  const router = useRouter();

  // Identity
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);

  // Tab
  const [tab, setTab] = useState<Tab>("preferences");

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);

  // Currency
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)!.symbol;

  // ── Members ───────────────────────────────────────────────────
  const [members, setMembers] = useState<GroupMember[]>([]);

  // ── All-ready banner ──────────────────────────────────────────
  const [allReady, setAllReady] = useState(false);
  const allReadyFired = useRef(false);

  // ── Preferences ──────────────────────────────────────────────
  const [prefs, setPrefs] = useState({
    budgetMin: "", budgetMax: "",
    tripDurationDays: "", vibe: "" as Vibe | "",
    departureDateFrom: "", departureDateTo: "",
  });
  const [yesNo, setYesNo] = useState<Record<YesNoKey, boolean | null>>({
    wantsBeach: null,
    wantsNightlife: null,
    okLongFlights: null,
    wantsOutdoor: null,
    prefersCity: null,
    budgetPriority: null,
    wantsRoadTrip: null,
    wantsWarmWeather: null,
    openToOffbeat: null,
    wantsAllInclusive: null,
  });
  const [prefsStatus, setPrefsStatus] = useState<AsyncStatus>("idle");
  const [prefsError, setPrefsError] = useState("");
  const [hasExistingPrefs, setHasExistingPrefs] = useState(false);

  // ── AI Match ─────────────────────────────────────────────────
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [matchStatus, setMatchStatus] = useState<AsyncStatus>("idle");
  const [matchError, setMatchError] = useState("");
  const [voteStatus, setVoteStatus] = useState<Record<string, AsyncStatus>>({});
  const [votedFor, setVotedFor] = useState<Record<string, "UP" | "DOWN">>({});
  const unanimousFired = useRef(false);

  // ── Trip Plan ─────────────────────────────────────────────────
  const [planDestIdx, setPlanDestIdx] = useState<number>(0);
  const [planContent, setPlanContent] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<AsyncStatus>("idle");
  const [planError, setPlanError] = useState("");
  const [planLoadingMsg, setPlanLoadingMsg] = useState("Searching for flights…");
  const planLoadingMsgs = [
    "Searching for flights…",
    "Finding hotels…",
    "Building your itinerary…",
    "Checking activities…",
    "Almost ready…",
  ];

  // ── Results ───────────────────────────────────────────────────
  const [results, setResults] = useState<DestinationResult[]>([]);
  const [resultsStatus, setResultsStatus] = useState<AsyncStatus>("idle");
  const [resultsError, setResultsError] = useState("");
  const [prefsSummary, setPrefsSummary] = useState<PrefSummaryEntry[]>([]);
  const [prefsSummaryStatus, setPrefsSummaryStatus] = useState<AsyncStatus>("idle");

  // ── Cost Split ────────────────────────────────────────────────
  const [splitForm, setSplitForm] = useState({ label: "", totalAmount: "", memberCount: "" });
  const [splitHistory, setSplitHistory] = useState<SplitEntry[]>([]);
  const [splitStatus, setSplitStatus] = useState<AsyncStatus>("idle");
  const [splitError, setSplitError] = useState("");

  // ─── Bootstrap — read localStorage + ?m= URL param ───────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mParam = params.get("m");

    if (mParam) {
      localStorage.setItem("ts_memberId", mParam);
      setMemberId(mParam);
    } else {
      setMemberId(localStorage.getItem("ts_memberId"));
    }
    setMemberName(localStorage.getItem("ts_memberName"));
    setGroupName(localStorage.getItem("ts_groupName"));

    // Restore dark mode preference
    const savedTheme = localStorage.getItem("ts_theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.dataset.theme = "dark";
    }
  }, []);

  // ─── Toggle dark mode ─────────────────────────────────────────
  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.dataset.theme = "dark";
      localStorage.setItem("ts_theme", "dark");
    } else {
      delete document.documentElement.dataset.theme;
      localStorage.setItem("ts_theme", "light");
    }
  }

  // ─── Load existing preferences once memberId is set ───────────
  useEffect(() => {
    if (!memberId) return;
    async function loadMyPrefs() {
      try {
        const res = await fetch(`/api/groups/${groupId}/preferences?memberId=${memberId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        setHasExistingPrefs(true);

        // Pre-fill form fields
        const toDateInput = (iso: string) => {
          const d = new Date(iso);
          return d.toISOString().split("T")[0];
        };

        setPrefs({
          budgetMin: String(data.budgetMin),
          budgetMax: String(data.budgetMax),
          tripDurationDays: String(data.tripDurationDays),
          vibe: data.vibe as Vibe,
          departureDateFrom: toDateInput(data.departureDateFrom),
          departureDateTo: toDateInput(data.departureDateTo),
        });

        const yn: Record<YesNoKey, boolean | null> = {
          wantsBeach:        data.wantsBeach,
          wantsNightlife:    data.wantsNightlife,
          okLongFlights:     data.okLongFlights,
          wantsOutdoor:      data.wantsOutdoor,
          prefersCity:       data.prefersCity,
          budgetPriority:    data.budgetPriority,
          wantsRoadTrip:     data.wantsRoadTrip,
          wantsWarmWeather:  data.wantsWarmWeather,
          openToOffbeat:     data.openToOffbeat,
          wantsAllInclusive: data.wantsAllInclusive,
        };
        setYesNo(yn);
      } catch { /* silent */ }
    }
    loadMyPrefs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  // ─── Fetch members (used for readiness panel + polling) ───────
  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch { /* silent */ }
  }, [groupId]);

  // Poll members every 10s while on preferences tab
  useEffect(() => {
    if (tab !== "preferences") return;
    fetchMembers();
    const id = setInterval(fetchMembers, 10_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, groupId]);

  // ─── "Everyone's ready!" banner detection ─────────────────────
  const membersReady = members.filter((m) => m.hasPreferences).length;

  useEffect(() => {
    if (
      members.length > 0 &&
      membersReady === members.length &&
      !allReadyFired.current
    ) {
      allReadyFired.current = true;
      setAllReady(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, angle: 60, origin: { y: 0.45 } }), 300);
      setTimeout(() => confetti({ particleCount: 60, spread: 100, angle: 120, origin: { y: 0.45 } }), 500);
    }
  }, [members, membersReady]);

  // ─── Unanimous upvote confetti ───────────────────────────────
  useEffect(() => {
    if (
      destinations.length > 0 &&
      destinations.every((d) => votedFor[d.id] === "UP") &&
      !unanimousFired.current
    ) {
      unanimousFired.current = true;
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.55 } });
    }
  }, [votedFor, destinations]);

  // ─── Fetch split history when switching to split tab ──────────
  const fetchSplitHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/split`);
      if (res.ok) {
        const data = await res.json();
        setSplitHistory(data);
      }
    } catch { /* silent */ }
  }, [groupId]);

  // Auto-load on tab switch
  useEffect(() => {
    if (tab === "results") {
      fetchResults();
      fetchPrefsSummary();
    }
    if (tab === "split") {
      fetchSplitHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ─── Preferences ─────────────────────────────────────────────
  async function submitPreferences(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) return;
    setPrefsStatus("loading");
    setPrefsError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          budgetMin: Number(prefs.budgetMin),
          budgetMax: Number(prefs.budgetMax),
          departureDateFrom: prefs.departureDateFrom
            ? new Date(prefs.departureDateFrom).toISOString()
            : new Date().toISOString(),
          departureDateTo: prefs.departureDateTo
            ? new Date(prefs.departureDateTo).toISOString()
            : new Date().toISOString(),
          tripDurationDays: Number(prefs.tripDurationDays),
          vibe: prefs.vibe,
          wantsBeach:        yesNo.wantsBeach ?? false,
          wantsNightlife:    yesNo.wantsNightlife ?? false,
          okLongFlights:     yesNo.okLongFlights ?? false,
          wantsOutdoor:      yesNo.wantsOutdoor ?? false,
          prefersCity:       yesNo.prefersCity ?? false,
          budgetPriority:    yesNo.budgetPriority ?? false,
          wantsRoadTrip:     yesNo.wantsRoadTrip ?? false,
          wantsWarmWeather:  yesNo.wantsWarmWeather ?? false,
          openToOffbeat:     yesNo.openToOffbeat ?? false,
          wantsAllInclusive: yesNo.wantsAllInclusive ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save preferences");
      setPrefsStatus("success");
      setHasExistingPrefs(true);
      fetchMembers(); // refresh the readiness panel immediately
    } catch (err: unknown) {
      setPrefsError(err instanceof Error ? err.message : "Something went wrong, try again");
      setPrefsStatus("error");
    }
  }

  // ─── AI Match ─────────────────────────────────────────────────
  async function triggerMatch() {
    setMatchStatus("loading");
    setMatchError("");
    setDestinations([]);
    unanimousFired.current = false;
    try {
      const res = await fetch(`/api/groups/${groupId}/match`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get destinations");
      setDestinations(data);
      setMatchStatus("success");
    } catch (err: unknown) {
      setMatchError(err instanceof Error ? err.message : "Something went wrong, try again");
      setMatchStatus("error");
    }
  }

  async function castVote(destinationId: string, value: "UP" | "DOWN") {
    if (!memberId) return;
    setVoteStatus((p) => ({ ...p, [destinationId]: "loading" }));
    try {
      const res = await fetch(`/api/groups/${groupId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, destinationId, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Vote failed");
      setVoteStatus((p) => ({ ...p, [destinationId]: "success" }));
      setVotedFor((p) => ({ ...p, [destinationId]: value }));
    } catch {
      setVoteStatus((p) => ({ ...p, [destinationId]: "error" }));
    }
  }

  // ─── Trip Plan ────────────────────────────────────────────────
  // When destinations load, try to restore the last saved plan
  useEffect(() => {
    if (destinations.length === 0) return;
    const best = getBestDestIdx(destinations, votedFor);
    setPlanDestIdx(best);
    // Try to load a saved plan for the top destination
    const d = destinations[best];
    fetch(`/api/groups/${groupId}/plan?destination=${encodeURIComponent(d.name + ", " + d.country)}`)
      .then((r) => r.json())
      .then((data) => { if (data?.content) setPlanContent(data.content); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinations.map((d) => d.id).join(",")]);

  async function generatePlan() {
    const d = destinations[planDestIdx];
    if (!d) return;
    setPlanStatus("loading");
    setPlanError("");
    setPlanContent(null);
    setPlanLoadingMsg(planLoadingMsgs[0]);

    // Cycle loading messages every 3 seconds
    let msgIdx = 0;
    const msgTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % planLoadingMsgs.length;
      setPlanLoadingMsg(planLoadingMsgs[msgIdx]);
    }, 3000);

    try {
      const res = await fetch(`/api/groups/${groupId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationName: d.name, destinationCountry: d.country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate plan");
      setPlanContent(data.content);
      setPlanStatus("success");
    } catch (err: unknown) {
      setPlanError(err instanceof Error ? err.message : "Something went wrong, try again");
      setPlanStatus("error");
    } finally {
      clearInterval(msgTimer);
    }
  }

  // ─── Results ──────────────────────────────────────────────────
  async function fetchResults() {
    setResultsStatus("loading");
    setResultsError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/results`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch results");
      setResults(data);
      setResultsStatus("success");
    } catch (err: unknown) {
      setResultsError(err instanceof Error ? err.message : "Something went wrong, try again");
      setResultsStatus("error");
    }
  }

  async function fetchPrefsSummary() {
    setPrefsSummaryStatus("loading");
    try {
      const res = await fetch(`/api/groups/${groupId}/preferences-summary`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch preferences");
      setPrefsSummary(data);
      setPrefsSummaryStatus("success");
    } catch {
      setPrefsSummaryStatus("error");
    }
  }

  // ─── Cost Split ───────────────────────────────────────────────
  async function submitSplit(e: React.FormEvent) {
    e.preventDefault();
    setSplitStatus("loading");
    setSplitError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: splitForm.label.trim(),
          totalAmount: Number(splitForm.totalAmount),
          memberCount: Number(splitForm.memberCount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate split");
      setSplitHistory((p) => [data, ...p]);
      setSplitForm({ label: "", totalAmount: "", memberCount: "" });
      setSplitStatus("success");
    } catch (err: unknown) {
      setSplitError(err instanceof Error ? err.message : "Something went wrong, try again");
      setSplitStatus("error");
    }
  }

  // ─── Trip countdown ───────────────────────────────────────────
  const earliestDeparture =
    prefsSummary.length > 0
      ? prefsSummary.reduce<Date | null>((earliest, p) => {
          const d = new Date(p.departureDateFrom);
          return earliest === null || d < earliest ? d : earliest;
        }, null)
      : null;

  const daysUntilTrip =
    earliestDeparture !== null
      ? Math.ceil((earliestDeparture.getTime() - Date.now()) / 86_400_000)
      : null;

  // ─── Tab definitions ─────────────────────────────────────────
  const allReady_forBadge = members.length > 0 && membersReady === members.length;

  const TABS: { key: Tab; label: string; badge?: string; dotBadge?: boolean }[] = [
    {
      key: "preferences",
      label: "Preferences",
      badge: members.length > 0 ? `${membersReady}/${members.length}` : undefined,
    },
    {
      key: "match",
      label: "AI Match",
      dotBadge: allReady_forBadge,
    },
    { key: "results", label: "Results" },
    { key: "split", label: "Cost Split" },
  ];

  const allYesNoAnswered = YES_NO_QUESTIONS.every((q) => yesNo[q.key] !== null);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <button
            onClick={() => router.push("/")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <span className="nav-brand">TripSync</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {/* Group name */}
            {groupName && (
              <span className="nav-group-name" title={groupName}>
                {groupName}
              </span>
            )}
            {/* Currency selector */}
            <select
              className="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              aria-label="Currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
              ))}
            </select>
            {/* Dark mode toggle */}
            <button
              className="dark-toggle"
              onClick={toggleDarkMode}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            {memberName && <span className="nav-group">{memberName}</span>}
          </div>
        </div>
      </nav>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div className="tab-bar">
        <div className="tab-bar-inner">
          {TABS.map(({ key, label, badge, dotBadge }) => (
            <button
              key={key}
              className={`tab-btn${tab === key ? " active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
              {badge && <span className="tab-badge">{badge}</span>}
              {dotBadge && <span className="tab-badge tab-badge--dot" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────── */}
      <div className="tab-content">
        <AnimatePresence mode="wait">

          {/* ── Preferences ─────────────────────────────────── */}
          {tab === "preferences" && (
            <motion.div key="preferences" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <div className="section-card">
                <h2 className="section-title">
                  {hasExistingPrefs ? "Update your preferences" : "Your travel preferences"}
                </h2>

                {/* Everyone's ready banner */}
                {allReady && (
                  <motion.div
                    className="all-ready-banner"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                  >
                    <span className="all-ready-banner-icon">🎉</span>
                    <div className="all-ready-banner-text">
                      <strong>Everyone&apos;s ready!</strong>
                      <span>Head to the AI Match tab to find your perfect destination.</span>
                    </div>
                  </motion.div>
                )}

                {/* Member readiness panel */}
                {members.length > 0 && (
                  <div className="members-ready-panel">
                    <div className="members-ready-label">
                      {membersReady}/{members.length} members ready
                    </div>
                    <div className="members-ready-list">
                      {members.map((m) => (
                        <span
                          key={m.id}
                          className={`member-chip ${m.hasPreferences ? "member-chip--done" : "member-chip--waiting"}`}
                          title={m.hasPreferences ? "Preferences submitted" : "Waiting…"}
                        >
                          {m.hasPreferences ? "✅" : "⏳"} {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit notice */}
                {hasExistingPrefs && prefsStatus !== "success" && (
                  <div className="edit-prefs-notice">
                    ✏️ You&apos;ve already submitted — edit below and save to update your preferences.
                  </div>
                )}

                {prefsStatus === "success" && (
                  <div className="notice notice-success">
                    Preferences saved! {allReady ? "Everyone's ready — go to AI Match!" : "Head to the AI Match tab when everyone's ready."}
                  </div>
                )}
                {prefsStatus === "error" && (
                  <div className="notice notice-error">{prefsError}</div>
                )}
                {!memberId && (
                  <div className="notice notice-error">
                    No session found. Please <a href="/join">join</a> or <a href="/create">create</a> a group first.
                  </div>
                )}

                <form onSubmit={submitPreferences}>
                  <div className="field">
                    <label className="field-label">
                      Budget range ({currencySymbol})
                    </label>
                    <div className="input-row">
                      <input className="input" type="number" placeholder="Min" min={0}
                        value={prefs.budgetMin}
                        onChange={(e) => setPrefs({ ...prefs, budgetMin: e.target.value })} required />
                      <input className="input" type="number" placeholder="Max" min={0}
                        value={prefs.budgetMax}
                        onChange={(e) => setPrefs({ ...prefs, budgetMax: e.target.value })} required />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Departure window</label>
                    <div className="input-row">
                      <input className="input" type="date"
                        value={prefs.departureDateFrom}
                        onChange={(e) => setPrefs({ ...prefs, departureDateFrom: e.target.value })} required />
                      <input className="input" type="date"
                        value={prefs.departureDateTo}
                        onChange={(e) => setPrefs({ ...prefs, departureDateTo: e.target.value })} required />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="tripDuration">Trip duration (days)</label>
                    <input id="tripDuration" className="input" type="number" placeholder="e.g. 7" min={1}
                      value={prefs.tripDurationDays}
                      onChange={(e) => setPrefs({ ...prefs, tripDurationDays: e.target.value })} required />
                  </div>

                  <div className="field" style={{ marginBottom: "1.5rem" }}>
                    <label className="field-label">Vibe</label>
                    <div className="vibe-grid">
                      {VIBES.map((v) => (
                        <button key={v} type="button"
                          className={`vibe-pill${prefs.vibe === v ? " selected" : ""}`}
                          onClick={() => setPrefs({ ...prefs, vibe: v })}>
                          {VIBE_LABELS[v]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Yes/No Questions */}
                  <div className="field" style={{ marginBottom: "1.5rem" }}>
                    <label className="field-label">A few quick questions</label>
                    <div className="yn-list">
                      {YES_NO_QUESTIONS.map((q) => (
                        <div key={q.key} className="yn-row">
                          <span className="yn-label">{q.label}</span>
                          <div className="yn-pills">
                            <button
                              type="button"
                              className={`yn-pill yn-yes${yesNo[q.key] === true ? " selected" : ""}`}
                              onClick={() => setYesNo((p) => ({ ...p, [q.key]: true }))}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              className={`yn-pill yn-no${yesNo[q.key] === false ? " selected" : ""}`}
                              onClick={() => setYesNo((p) => ({ ...p, [q.key]: false }))}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!allYesNoAnswered && (
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                        Answer all questions above to continue.
                      </p>
                    )}
                  </div>

                  <button type="submit" className="btn btn-primary btn-full"
                    disabled={prefsStatus === "loading" || !memberId || !prefs.vibe || !allYesNoAnswered}>
                    {prefsStatus === "loading"
                      ? "Saving…"
                      : hasExistingPrefs
                      ? "Update my preferences"
                      : "Save my preferences"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── AI Match ────────────────────────────────────── */}
          {tab === "match" && (
            <motion.div key="match" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <div className="section-card">
                <h2 className="section-title">AI destination matching</h2>

                {process.env.NEXT_PUBLIC_MOCK_AI === "true" && (
                  <div style={{
                    background: "#FFFBEB",
                    border: "1px solid #FCD34D",
                    borderRadius: "var(--radius)",
                    padding: "0.625rem 0.875rem",
                    fontSize: "0.8125rem",
                    color: "#92400E",
                    marginBottom: "1rem",
                  }}>
                    ⚠️ Test mode — using mock data. Set <code style={{ fontFamily: "monospace", background: "#FEF3C7", padding: "1px 4px", borderRadius: 3 }}>MOCK_AI=false</code> to use real AI.
                  </div>
                )}

                {matchError && (
                  <div className="notice notice-error">{matchError}</div>
                )}

                {matchStatus !== "loading" && (
                  <div className="match-trigger">
                    <button className="btn btn-primary" style={{ padding: "14px 28px" }}
                      onClick={triggerMatch}>
                      ✨ {destinations.length > 0 ? "Re-run AI match" : "Find destinations for our group"}
                    </button>
                  </div>
                )}
              </div>

              {/* Skeleton cards while loading */}
              {matchStatus === "loading" && (
                <div className="dest-list" style={{ marginTop: "1rem" }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="dest-card" style={{ overflow: "hidden" }}>
                      <div className="skeleton skeleton-img" />
                      <div className="dest-card-body">
                        <div className="skeleton skeleton-text skeleton-text--lg" style={{ marginBottom: "0.5rem" }} />
                        <div className="skeleton skeleton-text" style={{ marginBottom: "0.5rem" }} />
                        <div className="skeleton skeleton-text skeleton-text--sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {destinations.length > 0 && (
                <motion.div
                  className="dest-list"
                  style={{ marginTop: "1rem" }}
                  variants={cardContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {destinations.map((d) => (
                    <motion.div key={d.id} className="dest-card" variants={cardVariants}>
                      <DestinationImage name={d.name} country={d.country} />
                      <div className="dest-card-body">
                        <div className="dest-card-header">
                          <div>
                            <div className="dest-name">{d.name}</div>
                            <div className="dest-country">{d.country}</div>
                          </div>
                          <span className="score-badge">{d.score.toFixed(1)} / 10</span>
                        </div>
                        <p className="dest-reasoning">{d.reasoning}</p>
                        <div className="dest-footer">
                          <button
                            className={`vote-btn up${votedFor[d.id] === "UP" ? " voted" : ""}`}
                            onClick={() => castVote(d.id, "UP")}
                            disabled={voteStatus[d.id] === "loading"}
                          >
                            👍 Upvote
                          </button>
                          <button
                            className={`vote-btn down${votedFor[d.id] === "DOWN" ? " voted" : ""}`}
                            onClick={() => castVote(d.id, "DOWN")}
                            disabled={voteStatus[d.id] === "loading"}
                          >
                            👎 Downvote
                          </button>
                          <a
                            href={`https://www.google.com/flights?q=flights+to+${encodeURIComponent(d.name + " " + d.country)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="book-link"
                          >
                            ✈️ Flights
                          </a>
                          {voteStatus[d.id] === "success" && (
                            <span className="vote-feedback">✓ Voted</span>
                          )}
                          {voteStatus[d.id] === "error" && (
                            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Vote failed</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* ── Stage 2 — Trip Planner ──────────────────────── */}
              {destinations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  style={{ marginTop: "2.5rem" }}
                >
                  {/* Divider */}
                  <div className="plan-divider">
                    <span className="plan-divider-label">Step 2 — Plan your trip</span>
                  </div>

                  <div className="section-card" style={{ marginTop: "1.25rem" }}>
                    <h2 className="section-title">Plan your trip ✨</h2>

                    {/* Destination selector */}
                    <div className="field" style={{ marginBottom: "1.25rem" }}>
                      <label className="field-label">Destination</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        <select
                          className="input"
                          style={{ flex: 1, minWidth: 200 }}
                          value={planDestIdx}
                          onChange={(e) => {
                            const idx = Number(e.target.value);
                            setPlanDestIdx(idx);
                            setPlanContent(null);
                            setPlanStatus("idle");
                          }}
                        >
                          {destinations.map((d, i) => {
                            const v = votedFor[d.id];
                            const net = v === "UP" ? 1 : v === "DOWN" ? -1 : 0;
                            const label = i === getBestDestIdx(destinations, votedFor)
                              ? `⭐ ${d.name}, ${d.country} (top pick)`
                              : `${d.name}, ${d.country}${net > 0 ? " 👍" : net < 0 ? " 👎" : ""}`;
                            return <option key={d.id} value={i}>{label}</option>;
                          })}
                        </select>
                      </div>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                        ⭐ Auto-selected the top-voted destination — change it if you want to plan a different one.
                      </p>
                    </div>

                    {planError && <div className="notice notice-error">{planError}</div>}

                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: "13px 26px", fontSize: "1rem" }}
                        onClick={generatePlan}
                        disabled={planStatus === "loading"}
                      >
                        {planStatus === "loading"
                          ? "Generating…"
                          : planContent
                          ? "🔄 Regenerate plan"
                          : "🗺️ Generate full trip plan"}
                      </button>
                      {planContent && (
                        <button
                          className="btn btn-ghost"
                          onClick={() => window.print()}
                        >
                          🖨️ Print / Save PDF
                        </button>
                      )}
                    </div>

                    {/* Loading state */}
                    {planStatus === "loading" && (
                      <div className="plan-loading">
                        <div className="spinner" />
                        <p className="plan-loading-msg">{planLoadingMsg}</p>
                      </div>
                    )}
                  </div>

                  {/* Plan output */}
                  {planContent && planStatus !== "loading" && (
                    <motion.div
                      className="plan-output"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ReactMarkdown
                        components={{
                          h2: ({ children }) => (
                            <div className="plan-section-card">
                              <h2 className="plan-section-title">{children}</h2>
                            </div>
                          ),
                          h3: ({ children }) => <h3 className="plan-h3">{children}</h3>,
                          p: ({ children }) => <p className="plan-p">{children}</p>,
                          ul: ({ children }) => <ul className="plan-ul">{children}</ul>,
                          ol: ({ children }) => <ol className="plan-ol">{children}</ol>,
                          li: ({ children }) => <li className="plan-li">{children}</li>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="plan-link">
                              {children}
                            </a>
                          ),
                          strong: ({ children }) => <strong className="plan-strong">{children}</strong>,
                          hr: () => <hr className="plan-hr" />,
                          table: ({ children }) => (
                            <div className="plan-table-wrap">
                              <table className="plan-table">{children}</table>
                            </div>
                          ),
                          th: ({ children }) => <th className="plan-th">{children}</th>,
                          td: ({ children }) => <td className="plan-td">{children}</td>,
                          blockquote: ({ children }) => <blockquote className="plan-blockquote">{children}</blockquote>,
                          code: ({ children }) => <code className="plan-code">{children}</code>,
                        }}
                      >
                        {planContent}
                      </ReactMarkdown>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Results ─────────────────────────────────────── */}
          {tab === "results" && (
            <motion.div key="results" variants={tabVariants} initial="initial" animate="animate" exit="exit">

              {/* Trip countdown */}
              {daysUntilTrip !== null && daysUntilTrip > 0 && (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                  <div className="trip-countdown">
                    🗓️ {daysUntilTrip} day{daysUntilTrip !== 1 ? "s" : ""} until the earliest departure
                  </div>
                </div>
              )}
              {daysUntilTrip !== null && daysUntilTrip <= 0 && (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                  <div className="trip-countdown">🛫 Trip time!</div>
                </div>
              )}

              {/* Group preferences summary */}
              <div className="section-card" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h2 className="section-title" style={{ margin: 0 }}>Group preferences</h2>
                  {prefsSummaryStatus === "loading" && (
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Loading…</span>
                  )}
                </div>

                {prefsSummaryStatus === "success" && prefsSummary.length === 0 && (
                  <div className="empty">No preferences submitted yet.</div>
                )}

                {prefsSummary.length > 0 && (
                  <div className="prefs-summary-list">
                    {prefsSummary.map((p) => (
                      <div key={p.memberName} className="prefs-summary-card">
                        <div className="prefs-summary-name">{p.memberName}</div>
                        <div className="prefs-summary-meta">
                          <span>💰 {currencySymbol}{p.budgetMin}–{currencySymbol}{p.budgetMax}</span>
                          <span>📅 {new Date(p.departureDateFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {new Date(p.departureDateTo).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span>🗓️ {p.tripDurationDays} days</span>
                          <span>✈️ {p.vibe.charAt(0) + p.vibe.slice(1).toLowerCase()}</span>
                        </div>
                        <div className="prefs-yn-list">
                          {p.questions.map((q) => (
                            <div key={q.key} className="prefs-yn-row">
                              <span className="prefs-yn-icon">{q.answer ? "✅" : "❌"}</span>
                              <span className="prefs-yn-label">{q.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vote results */}
              <div className="section-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h2 className="section-title" style={{ margin: 0 }}>Vote results</h2>
                  <button className="btn btn-ghost btn-sm" onClick={fetchResults}
                    disabled={resultsStatus === "loading"}>
                    {resultsStatus === "loading" ? "Loading…" : "↻ Refresh"}
                  </button>
                </div>

                {resultsError && <div className="notice notice-error">{resultsError}</div>}

                {resultsStatus === "loading" && results.length === 0 && (
                  <div className="spinner-wrap"><div className="spinner" /></div>
                )}
                {resultsStatus === "success" && results.length === 0 && (
                  <div className="empty">No destinations voted on yet. Head to AI Match to get started.</div>
                )}
              </div>

              {results.length > 0 && (
                <motion.div
                  className="dest-list"
                  style={{ marginTop: "1rem" }}
                  variants={cardContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {results.map((d, i) => (
                    <motion.div key={d.id}
                      className={`dest-card${i === 0 ? " top-pick" : ""}`}
                      variants={cardVariants}
                    >
                      <DestinationImage name={d.name} country={d.country} />
                      <div className="dest-card-body">
                        {i === 0 && <div className="top-pick-label">🏆 Top pick</div>}
                        <div className="dest-card-header">
                          <div>
                            <div className="dest-name">{d.name}</div>
                            <div className="dest-country">{d.country}</div>
                          </div>
                          <span className="score-badge">{d.score.toFixed(1)} / 10</span>
                        </div>
                        <p className="dest-reasoning">{d.reasoning}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                          <div className="vote-tally">
                            <span className="tally-up">👍 {d.upvotes}</span>
                            <span className="tally-down">👎 {d.downvotes}</span>
                            <span className="tally-net">
                              net {d.upvotes - d.downvotes > 0 ? "+" : ""}{d.upvotes - d.downvotes}
                            </span>
                          </div>
                          <a
                            href={`https://www.google.com/flights?q=flights+to+${encodeURIComponent(d.name + " " + d.country)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="book-link"
                          >
                            ✈️ Find flights
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Cost Split ───────────────────────────────────── */}
          {tab === "split" && (
            <motion.div key="split" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <div className="section-card">
                <h2 className="section-title">Cost split calculator</h2>

                {splitError && <div className="notice notice-error">{splitError}</div>}

                <form onSubmit={submitSplit}>
                  <div className="field">
                    <label className="field-label" htmlFor="splitLabel">Label</label>
                    <input id="splitLabel" className="input" type="text"
                      placeholder="e.g. Flights, Hotel, Car rental"
                      value={splitForm.label}
                      onChange={(e) => setSplitForm({ ...splitForm, label: e.target.value })} required />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="totalAmount">
                      Total amount ({currencySymbol})
                    </label>
                    <input id="totalAmount" className="input" type="number"
                      placeholder="e.g. 1200" min={0} step="0.01"
                      value={splitForm.totalAmount}
                      onChange={(e) => setSplitForm({ ...splitForm, totalAmount: e.target.value })} required />
                  </div>

                  <div className="field" style={{ marginBottom: "1.5rem" }}>
                    <label className="field-label" htmlFor="memberCount">Number of people</label>
                    <input id="memberCount" className="input" type="number"
                      placeholder="e.g. 4" min={1} step={1}
                      value={splitForm.memberCount}
                      onChange={(e) => setSplitForm({ ...splitForm, memberCount: e.target.value })} required />
                  </div>

                  <button type="submit" className="btn btn-primary btn-full"
                    disabled={splitStatus === "loading"}>
                    {splitStatus === "loading" ? "Calculating…" : "Calculate split"}
                  </button>
                </form>

                {splitHistory.length > 0 && (
                  <>
                    <AnimatePresence>
                      {splitHistory[0] && (
                        <motion.div
                          key="latest-split"
                          className="split-result-box"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="split-result-amount">
                            {currencySymbol}{splitHistory[0].amountPerPerson.toFixed(2)} per person
                          </div>
                          <div className="split-result-label">
                            {splitHistory[0].label} · {currencySymbol}{splitHistory[0].totalAmount.toFixed(2)} ÷ {splitHistory[0].memberCount} people
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {splitHistory.length > 1 && (
                      <ul className="split-history-list">
                        {splitHistory.slice(1).map((s, i) => (
                          <li key={s.id ?? i} className="split-history-row">
                            <div>
                              <div className="split-row-label">{s.label}</div>
                              <div className="split-row-meta">
                                {currencySymbol}{s.totalAmount.toFixed(2)} ÷ {s.memberCount} people
                              </div>
                            </div>
                            <div className="split-row-per">
                              {currencySymbol}{s.amountPerPerson.toFixed(2)}/person
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
