"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import DestinationSlideshow from "@/app/components/DestinationSlideshow";

type Status = "idle" | "loading" | "error";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inviteCode, setInviteCode] = useState("");
  const [memberName, setMemberName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // Pre-fill code from URL ?code=XXXXXX
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setInviteCode(code.toUpperCase().slice(0, 6));
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim() || !memberName.trim()) return;

    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          memberName: memberName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join group");

      localStorage.setItem("ts_groupId", data.groupId);
      localStorage.setItem("ts_memberId", data.memberId);
      localStorage.setItem("ts_memberName", memberName.trim());

      router.push(`/group/${data.groupId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong, try again");
      setStatus("error");
    }
  }

  return (
    <motion.div
      style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 480 }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <button className="back-link back-link--light" onClick={() => router.push("/")}>
        ← Back to home
      </button>

      <div className="auth-card">
        <h1 className="auth-card-title">Join a group</h1>

        {status === "error" && (
          <div className="notice notice-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="inviteCode">Invite code</label>
            <input
              id="inviteCode"
              className="input"
              type="text"
              placeholder="e.g. AB12CD"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              autoFocus={!inviteCode}
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 700,
                fontSize: "1.1rem",
              }}
            />
          </div>

          <div className="field" style={{ marginBottom: "1.5rem" }}>
            <label className="field-label" htmlFor="memberName">Your name</label>
            <input
              id="memberName"
              className="input"
              type="text"
              placeholder="e.g. Jordan"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              required
              autoFocus={!!inviteCode}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Joining…" : "Join group"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

export default function JoinPage() {
  return (
    <div className="auth-page auth-page--slideshow">
      <DestinationSlideshow />
      <Suspense fallback={<div style={{ position: "relative", zIndex: 2 }} />}>
        <JoinForm />
      </Suspense>
    </div>
  );
}
