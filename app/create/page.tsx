"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import DestinationSlideshow from "@/app/components/DestinationSlideshow";

type Status = "idle" | "loading" | "done" | "error";

interface CreatedGroup {
  id: string;
  name: string;
  inviteCode: string;
}

export default function CreatePage() {
  const router = useRouter();

  const [groupName, setGroupName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedGroup | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim() || !memberName.trim()) return;

    setStatus("loading");
    setError("");

    try {
      const groupRes = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() }),
      });
      if (!groupRes.ok) {
        const d = await groupRes.json();
        throw new Error(d.error || "Failed to create group");
      }
      const group: CreatedGroup = await groupRes.json();

      const joinRes = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: group.inviteCode, memberName: memberName.trim() }),
      });
      if (!joinRes.ok) {
        const d = await joinRes.json();
        throw new Error(d.error || "Failed to join group");
      }
      const { memberId } = await joinRes.json();

      localStorage.setItem("ts_groupId", group.id);
      localStorage.setItem("ts_memberId", memberId);
      localStorage.setItem("ts_memberName", memberName.trim());

      setCreated(group);
      setStatus("done");

      // 🎉 Confetti!
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.55 } });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 }, angle: 60 }), 250);
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 }, angle: 120 }), 400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong, try again");
      setStatus("error");
    }
  }

  async function copyCode() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch { /* silent fallback */ }
  }

  async function copyLink() {
    if (!created) return;
    try {
      const url = `${window.location.origin}/join?code=${created.inviteCode}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch { /* silent fallback */ }
  }

  return (
    <div className="auth-page auth-page--slideshow">
      <DestinationSlideshow />

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
          {status !== "done" ? (
            <>
              <h1 className="auth-card-title">Create a group</h1>

              {status === "error" && (
                <div className="notice notice-error">{error}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="field-label" htmlFor="groupName">Group name</label>
                  <input
                    id="groupName"
                    className="input"
                    type="text"
                    placeholder="e.g. Barcelona Summer 2025"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="field" style={{ marginBottom: "1.5rem" }}>
                  <label className="field-label" htmlFor="memberName">Your name</label>
                  <input
                    id="memberName"
                    className="input"
                    type="text"
                    placeholder="e.g. Alex"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Creating…" : "Create group"}
                </button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <h1 className="auth-card-title" style={{ textAlign: "center" }}>
                Group created! 🎉
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem", textAlign: "center" }}>
                Share the code or link below so your friends can join.
              </p>

              {/* Big invite code */}
              <div className="invite-code-display">{created!.inviteCode}</div>

              {/* Copy buttons */}
              <div className="invite-actions">
                <button className="btn btn-outline" onClick={copyCode}>
                  {copiedCode ? "✓ Copied!" : "Copy code"}
                </button>
                <button className="btn btn-primary" onClick={copyLink}>
                  {copiedLink ? "✓ Link copied!" : "🔗 Copy invite link"}
                </button>
              </div>

              <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", textAlign: "center", marginBottom: "1.5rem" }}>
                Link takes friends straight to the join form — no need to type the code.
              </p>

              <button
                className="btn btn-ghost btn-full"
                onClick={() => router.push(`/group/${created!.id}`)}
              >
                Go to my group →
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
