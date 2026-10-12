"use client";

import { useState } from "react";

interface Lead {
  id: string;
  company_name: string;
  website?: string;
  domain?: string;
  city?: string;
  state?: string;
  source: string;
  contacts: Array<{
    id: string;
    email: string;
    name?: string;
    title?: string;
    email_status: string;
    confidence?: number;
  }>;
}

const US_CITIES = [
  "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
  "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
  "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte",
  "Indianapolis", "San Francisco", "Seattle", "Denver", "Nashville",
  "Portland", "Miami", "Atlanta", "Minneapolis", "Boston",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

function Tag({
  value,
  onRemove,
}: {
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className="tag">
      {value}
      <button type="button" onClick={onRemove}>×</button>
    </span>
  );
}

export default function SearchPage() {
  const [keywords, setKeywords] = useState("home decor store");
  const [cities, setCities] = useState<string[]>(["Austin", "Dallas"]);
  const [states, setStates] = useState<string[]>(["TX"]);
  const [cityInput, setCityInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Lead[]>([]);
  const [dryRun, setDryRun] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [error, setError] = useState("");

  const addCity = (city: string) => {
    const trimmed = city.trim();
    if (trimmed && !cities.includes(trimmed)) setCities((c) => [...c, trimmed]);
    setCityInput("");
  };

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, cities, states }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.leads ?? []);
      setDryRun(data.dryRun);
      setMockMode(data.mockMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Find Buyers</h1>
        <p>Discover US home decor buyers from multiple live APIs</p>
      </div>

      {dryRun && (
        <div className="alert alert-warning">
          🔒 <strong>DRY_RUN mode is ON</strong> — All emails will be sent only to your test address. Set <code>DRY_RUN=false</code> in .env.local when ready for real outreach.
        </div>
      )}

      {mockMode && (
        <div className="alert alert-info">
          🧪 Running in <strong>mock mode</strong> — No API keys detected. Add <code>GOOGLE_PLACES_KEY</code> and <code>HUNTER_KEY</code> to .env.local to get live data.
        </div>
      )}

      <div className="card mb-6">
        <div className="field">
          <label>Keywords</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. home decor store, interior design boutique"
          />
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Cities</label>
            <div className="tag-input-area" onClick={() => {}}>
              {cities.map((c) => (
                <Tag key={c} value={c} onRemove={() => setCities(cities.filter((x) => x !== c))} />
              ))}
              <input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addCity(cityInput);
                  }
                }}
                onBlur={() => cityInput && addCity(cityInput)}
                placeholder="Type a city, press Enter"
                style={{ background: "transparent", border: "none", outline: "none", flex: 1, minWidth: 120, boxShadow: "none" }}
              />
            </div>
            <p className="text-muted" style={{ marginTop: 4 }}>
              Popular:{" "}
              {US_CITIES.slice(0, 8).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => addCity(c)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-light)",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: "0 4px",
                  }}
                >
                  {c}
                </button>
              ))}
            </p>
          </div>

          <div className="field">
            <label>States</label>
            <div className="tag-input-area">
              {states.map((s) => (
                <Tag key={s} value={s} onRemove={() => setStates(states.filter((x) => x !== s))} />
              ))}
            </div>
            <p className="text-muted" style={{ marginTop: 4 }}>
              {US_STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (!states.includes(s)) setStates((st) => [...st, s]);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: states.includes(s) ? "var(--accent-light)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: "1px 4px",
                  }}
                >
                  {s}
                </button>
              ))}
            </p>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={loading || !keywords}
        >
          {loading ? <><span className="spinner" /> Searching...</> : "🔍 Find Buyers"}
        </button>
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      {results.length > 0 && (
        <div className="card">
          <div className="flex flex-center gap-4 mb-4">
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>
              {results.length} leads found
            </h2>
            <span className="text-muted">
              {results.reduce((s, l) => s + l.contacts.length, 0)} contacts enriched
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Source</th>
                  <th>Contacts</th>
                  <th>Website</th>
                </tr>
              </thead>
              <tbody>
                {results.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.company_name}</strong>
                      {lead.domain && (
                        <div className="text-muted">{lead.domain}</div>
                      )}
                    </td>
                    <td>
                      {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td>
                      <span className="badge badge-queued">{lead.source}</span>
                    </td>
                    <td>
                      {lead.contacts.length > 0 ? (
                        <span style={{ color: "var(--success)", fontSize: 13 }}>
                          ✓ {lead.contacts.length} found
                        </span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td>
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                          Visit ↗
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <a href="/leads" className="btn btn-secondary">
              📋 View All Leads & Verify Emails →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
