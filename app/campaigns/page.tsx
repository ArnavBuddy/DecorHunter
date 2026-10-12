"use client";

import { useState, useEffect, useCallback } from "react";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  status: string;
  created_at: string;
  _count: { messages: number };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1>Campaigns</h1>
          <p>All outreach campaigns and their status</p>
        </div>
        <a href="/campaigns/new" className="btn btn-primary">+ New Campaign</a>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><span className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <h3>No campaigns yet</h3>
            <p>Create your first campaign to start reaching out to buyers.</p>
            <a href="/campaigns/new" className="btn btn-primary" style={{ marginTop: 16 }}>
              ✉️ New Campaign
            </a>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Sender</th>
                  <th>Messages</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td className="text-muted">{c.subject}</td>
                    <td className="text-muted">{c.from_name}</td>
                    <td>{c._count.messages}</td>
                    <td>
                      <span className={`badge badge-${c.status === "done" ? "delivered" : c.status === "sending" ? "sent" : "queued"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <a href={`/campaigns/${c.id}`} className="btn btn-secondary" style={{ padding: "5px 12px", fontSize: 13 }}>
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
