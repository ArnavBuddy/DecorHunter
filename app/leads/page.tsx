"use client";

import { useState, useEffect, useCallback } from "react";

interface Contact {
  id: string;
  email: string;
  name?: string;
  title?: string;
  email_status: string;
  confidence?: number;
  source?: string;
  lead: {
    id: string;
    company_name: string;
    city?: string;
    state?: string;
  };
}

interface Lead {
  id: string;
  company_name: string;
  city?: string;
  state?: string;
  source: string;
  contacts: Contact[];
}

const STATUS_FILTER_OPTIONS = ["all", "unverified", "valid", "risky", "invalid"];

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data.leads ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const allContacts: (Contact & { lead_name: string })[] = leads.flatMap((l) =>
    l.contacts.map((c) => ({
      ...c,
      lead: { id: l.id, company_name: l.company_name, city: l.city, state: l.state },
      lead_name: l.company_name,
    }))
  );

  const filtered = statusFilter === "all"
    ? allContacts
    : allContacts.filter((c) => c.email_status === statusFilter);

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const verify = async () => {
    setVerifying(true);
    try {
      await fetch("/api/leads/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selected) }),
      });
      await fetchLeads();
      setSelected(new Set());
    } finally {
      setVerifying(false);
    }
  };

  const stats = {
    total: allContacts.length,
    valid: allContacts.filter((c) => c.email_status === "valid").length,
    unverified: allContacts.filter((c) => c.email_status === "unverified").length,
    risky: allContacts.filter((c) => c.email_status === "risky").length,
    invalid: allContacts.filter((c) => c.email_status === "invalid").length,
  };

  return (
    <div>
      <div className="page-header">
        <h1>Leads</h1>
        <p>All discovered buyer contacts — verify emails before sending campaigns</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Contacts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{stats.valid}</div>
          <div className="stat-label">Valid Emails</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--text-muted)" }}>{stats.unverified}</div>
          <div className="stat-label">Unverified</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--warning)" }}>{stats.risky}</div>
          <div className="stat-label">Risky</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--danger)" }}>{stats.invalid}</div>
          <div className="stat-label">Invalid</div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-center gap-3 mb-4" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="flex flex-center gap-2">
            <span className="text-muted">Filter:</span>
            {STATUS_FILTER_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`btn btn-secondary`}
                style={{
                  padding: "5px 12px",
                  fontSize: 13,
                  background: statusFilter === s ? "var(--accent-glow)" : undefined,
                  color: statusFilter === s ? "var(--accent-light)" : undefined,
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex flex-center gap-3">
            {selected.size > 0 && (
              <>
                <span className="text-muted">{selected.size} selected</span>
                <button
                  className="btn btn-primary"
                  onClick={verify}
                  disabled={verifying}
                >
                  {verifying ? <><span className="spinner" /> Verifying...</> : "✓ Verify Selected"}
                </button>
              </>
            )}
            <a href="/campaigns/new" className="btn btn-success">
              ✉️ Create Campaign
            </a>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No contacts yet</h3>
            <p>Run a search first to discover leads and contacts.</p>
            <a href="/search" className="btn btn-primary" style={{ marginTop: 16 }}>
              🔍 Find Buyers
            </a>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(contact.id)}
                        onChange={() => {
                          const s = new Set(selected);
                          s.has(contact.id) ? s.delete(contact.id) : s.add(contact.id);
                          setSelected(s);
                        }}
                      />
                    </td>
                    <td>
                      <strong style={{ fontSize: 14 }}>{contact.lead.company_name}</strong>
                    </td>
                    <td>
                      <div>{contact.name ?? "—"}</div>
                      {contact.title && <div className="text-muted">{contact.title}</div>}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                      {contact.email}
                    </td>
                    <td><StatusBadge status={contact.email_status} /></td>
                    <td>
                      {contact.confidence != null ? (
                        <span style={{ color: contact.confidence > 70 ? "var(--success)" : "var(--warning)" }}>
                          {contact.confidence}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="text-muted">
                      {[contact.lead.city, contact.lead.state].filter(Boolean).join(", ") || "—"}
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
