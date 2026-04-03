"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const cardVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.12, ease: "easeOut" as const },
  }),
};

export default function StartPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column" }}>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <button
            onClick={() => router.push("/")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <span className="nav-brand">TripSync</span>
          </button>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="start-page">
        <motion.div
          className="start-header"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <h1 className="start-title">How are you joining?</h1>
          <p className="start-sub">Start a new trip or jump into one your friend already created.</p>
        </motion.div>

        <div className="start-cards">
          <motion.button
            className="start-card"
            onClick={() => router.push("/create")}
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(14,165,233,0.18)" }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="start-card-icon">✈️</div>
            <div className="start-card-title">Create a group</div>
            <div className="start-card-desc">
              You&apos;re the organiser. Invite your friends with a code and start planning.
            </div>
            <div className="start-card-arrow">→</div>
          </motion.button>

          <motion.button
            className="start-card"
            onClick={() => router.push("/join")}
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(14,165,233,0.18)" }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="start-card-icon">🤝</div>
            <div className="start-card-title">Join a group</div>
            <div className="start-card-desc">
              A friend sent you a code. Enter it here to add your preferences to the trip.
            </div>
            <div className="start-card-arrow">→</div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
