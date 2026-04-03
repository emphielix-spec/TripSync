"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import DestinationImage from "@/app/components/DestinationImage";

// ─── Types ────────────────────────────────────────────────────
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

// ─── Component ────────────────────────────────────────────────
export default function GroupPage({ params }: { params: { id: string } }) {
  const groupId = params.id;
  const router = useRouter();

  // Identity
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);

  // Tab
  const [tab, setTab] = useState<Tab>("preferences");

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

  // ── AI Match ─────────────────────────────────────────────────
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [matchStatus, setMatchStatus] = useState<AsyncStatus>("idle");
  const [matchError, setMatchError] = useState("");
  const [voteStatus, setVoteStatus] = useState<Record<string, AsyncStatus>>({});
  const [votedFor, setVotedFor] = useState<Record<string, "UP" | "DOWN">>({});

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

  // ─── Bootstrap ───────────────────────────────────────────────
  useEffect(() => {
    setMemberId(localStorage.getItem("ts_memberId"));
    setMemberName(localStorage.getItem("ts_memberName"));
  }, []);

  // Auto-load results + prefs summary when switching to results tab
  useEffect(() => {
    if (tab === "results") {
      fetchResults();
      fetchPrefsSummary();
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
          // Convert null → false for unanswered questions
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

  const TABS: { key: Tab; label: string }[] = [
    { key: "preferences", label: "Preferences" },
    { key: "match",       label: "AI Match" },
    { key: "results",     label: "Results" },
    { key: "split",       label: "Cost Split" },
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
          {memberName && <span className="nav-group">{memberName}</span>}
        </div>
      </nav>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div className="tab-bar">
        <div className="tab-bar-inner">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`tab-btn${tab === key ? " active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
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
                <h2 className="section-title">Your travel preferences</h2>

                {prefsStatus === "success" && (
                  <div className="notice notice-success">
                    Preferences saved! Head to the AI Match tab when everyone&apos;s ready.
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
                    <label className="field-label">Budget range (€)</label>
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
                    {prefsStatus === "loading" ? "Saving…" : "Save my preferences"}
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
                      ✨ Find destinations for our group
                    </button>
                  </div>
                )}

                {matchStatus === "loading" && (
                  <div className="spinner-wrap">
                    <div className="spinner" />
                    <p className="spinner-text">Finding the best destinations for your group…</p>
                  </div>
                )}
              </div>

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
                          {voteStatus[d.id] === "success" && (
                            <span className="vote-feedback">✓ Vote recorded</span>
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
            </motion.div>
          )}

          {/* ── Results ─────────────────────────────────────── */}
          {tab === "results" && (
            <motion.div key="results" variants={tabVariants} initial="initial" animate="animate" exit="exit">

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
                          <span>💰 €{p.budgetMin}–€{p.budgetMax}</span>
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
                        <div className="vote-tally">
                          <span className="tally-up">👍 {d.upvotes}</span>
                          <span className="tally-down">👎 {d.downvotes}</span>
                          <span className="tally-net">
                            net {d.upvotes - d.downvotes > 0 ? "+" : ""}{d.upvotes - d.downvotes}
                          </span>
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
                    <label className="field-label" htmlFor="totalAmount">Total amount (€)</label>
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
                            €{splitHistory[0].amountPerPerson.toFixed(2)} per person
                          </div>
                          <div className="split-result-label">
                            {splitHistory[0].label} · €{splitHistory[0].totalAmount.toFixed(2)} ÷ {splitHistory[0].memberCount} people
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {splitHistory.length > 1 && (
                      <ul className="split-history-list">
                        {splitHistory.slice(1).map((s, i) => (
                          <li key={i} className="split-history-row">
                            <div>
                              <div className="split-row-label">{s.label}</div>
                              <div className="split-row-meta">
                                €{s.totalAmount.toFixed(2)} ÷ {s.memberCount} people
                              </div>
                            </div>
                            <div className="split-row-per">
                              €{s.amountPerPerson.toFixed(2)}/person
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
