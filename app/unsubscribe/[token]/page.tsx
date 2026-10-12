"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function UnsubscribePage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => {
        // The API redirects to /unsubscribe/success, so if we land here
        // via direct navigation, treat as success
        setStatus(r.ok || r.redirected ? "success" : "error");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        textAlign: "center",
        padding: 40,
      }}
    >
      {status === "loading" && (
        <>
          <span className="spinner" style={{ width: 40, height: 40 }} />
          <p>Processing your unsubscribe request…</p>
        </>
      )}
      {status === "success" && (
        <>
          <div style={{ fontSize: 48 }}>✅</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>You've been unsubscribed</h1>
          <p style={{ color: "var(--text-muted)" }}>
            You will not receive any further emails from us.
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Invalid link</h1>
          <p style={{ color: "var(--text-muted)" }}>
            This unsubscribe link is invalid or has already been used.
          </p>
        </>
      )}
    </div>
  );
}
