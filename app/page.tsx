"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();

  return (
    <div className="hero">
      <div className="hero-inner">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <span className="hero-badge">✈️ Group travel, made easy</span>
        </motion.div>

        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.07, ease: "easeOut" }}
        >
          Trip<span>Sync</span>
        </motion.h1>

        <motion.p
          className="hero-tagline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: "easeOut" }}
        >
          AI-powered destination matching for groups.<br />
          Everyone votes, no one argues.
        </motion.p>

        <motion.div
          className="hero-features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.22, ease: "easeOut" }}
        >
          <span>🤖 AI matching</span>
          <span>🗳️ Group voting</span>
          <span>💸 Cost split</span>
          <span>🔒 No account needed</span>
        </motion.div>

        <motion.div
          className="hero-buttons"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28, ease: "easeOut" }}
        >
          <button className="btn-hero-primary" onClick={() => router.push("/create")}>
            Create a group
          </button>
          <button className="btn-hero" onClick={() => router.push("/join")}>
            Join with a code
          </button>
        </motion.div>

      </div>
    </div>
  );
}
