"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface Message {
  id: string;
  status: string;
  sent_at?: string;
  contact: {
    email: string;
    name?: string;
    lead: { company_name: string };
  };
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  status: string;
  messages: Message[];
}

interface Stats {
  total: number;
  queued: number;
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const fetchCampaign = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}`);
    const data = await res.json();
    if (res.ok) {
      setCampaign(data.campaign);
      setStats(data.stats);
    }
  }, [id]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  const startSending = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      await fetchCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  if (!campaign || !stats) {
    return <div className="empty-state"><span className="spinner" style={{ width: 32, height: 32 }} /></div>;
  }

  const progress = stats.total > 0
    ? Math.round(((stats.sent + stats.delivered + stats.bounced + stats.failed) / stats.total) * 100)
    : 0;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>{campaign.name}</h1>
          <p>From: {campaign.from_name} &lt;{campaign.from_email}&gt; · Subject: {campaign.subject}</p>
        </div>
        {campaign.status !== "done" && (
          <button
            className="btn btn-primary"
            onClick={startSending}
            disabled={sending || campaign.status === "sending"}
          >
            {sending ? <><span className="spinner" /> Sending...</> : "▶ Start Sending"}
          </button>
        )}
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--info)" }}>{stats.queued}</div>
          <div className="stat-label">Queued</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--accent-light)" }}>{stats.sent}</div>
          <div className="stat-label">Sent</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{stats.delivered}</div>
          <div className="stat-label">Delivered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--danger)" }}>{stats.bounced}</div>
          <div className="stat-label">Bounced</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--warning)" }}>{stats.failed}</div>
          <div className="stat-label">Failed</div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-center gap-3 mb-4" style={{ justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600 }}>Send Progress — {progress}%</span>
          <span className={`badge badge-${campaign.status === "done" ? "delivered" : campaign.status === "sending" ? "sent" : "queued"}`}>
            {campaign.status}
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Messages</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Status</th>
                <th>Sent At</th>
              </tr>
            </thead>
            <tbody>
              {campaign.messages.map((m) => (
                <tr key={m.id}>
                  <td>{m.contact.lead?.company_name ?? "—"}</td>
                  <td>{m.contact.name ?? "—"}</td>
                  <td style={{ fontSize: 13, fontFamily: "monospace" }}>{m.contact.email}</td>
                  <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                  <td className="text-muted">
                    {m.sent_at ? new Date(m.sent_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
