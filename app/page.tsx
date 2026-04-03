"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import DestinationSlideshow from "@/app/components/DestinationSlideshow";

const HOW_IT_WORKS = [
  { icon: "🧑‍🤝‍🧑", text: "Create a group and share the invite code with your friends" },
  { icon: "🗺️", text: "Everyone fills in their budget, dates, and travel preferences" },
  { icon: "🤖", text: "AI picks the 3 best destinations that work for everyone" },
  { icon: "🗳️", text: "Vote on your favourites — the top pick wins" },
  { icon: "💸", text: "Split costs right in the app, no spreadsheets needed" },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="landing">
      {/* ── Background slideshow ───────────────────────────────── */}
      <DestinationSlideshow />

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="landing-inner">

        <motion.div
          className="landing-logo"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          TripSync
        </motion.div>

        <motion.div
          className="landing-content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        >
          <h1 className="landing-title">
            Plan your group trip.<br />
            <span>Without the chaos.</span>
          </h1>

          <p className="landing-subtitle">
            One app. Everyone agrees on where to go.
          </p>

          <ul className="landing-steps">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.li
                key={i}
                className="landing-step"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.07, ease: "easeOut" }}
              >
                <span className="step-icon">{step.icon}</span>
                <span>{step.text}</span>
              </motion.li>
            ))}
          </ul>

          <motion.button
            className="landing-cta"
            onClick={() => router.push("/start")}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.75, ease: "easeOut" }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Let&apos;s start →
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}
