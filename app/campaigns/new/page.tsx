"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Contact {
  id: string;
  email: string;
  name?: string;
  title?: string;
  email_status: string;
  lead: { company_name: string };
}

const TEMPLATE_VARS = ["{{company}}", "{{first_name}}", "{{unsubscribe_link}}"];

const DEFAULT_TEMPLATE = `Hi {{first_name}},

I came across {{company}} and wanted to reach out about our home decor wholesale collections.

We work with boutiques and interior designers across the US and would love to explore whether our pieces might be a good fit for your store.

Would you be open to a quick call this week?

Best regards,
[Your Name]`;

export default function NewCampaignPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    name: "",
    subject: "Wholesale Home Decor — Let's Connect",
    body_template: DEFAULT_TEMPLATE,
    from_name: "",
    from_email: "",
  });
  const [creating, setCreating] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        const all: Contact[] = (data.leads ?? []).flatMap((l: any) =>
          l.contacts
            .filter((c: Contact) => c.email_status === "valid" || c.email_status === "unverified")
            .map((c: Contact) => ({ ...c, lead: { company_name: l.company_name } }))
        );
        setContacts(all);
        // Pre-select valid ones
        setSelected(new Set(all.filter((c) => c.email_status === "valid").map((c) => c.id)));
      });
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contact_ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create campaign");
      router.push(`/campaigns/${data.campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setCreating(false);
    }
  };

  const handleTestSend = async () => {
    // Create a test campaign with just one contact (self)
    setTestSending(true);
    setError("");
    setSuccess("");
    try {
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contact_ids: [] }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? "Failed");

      const sendRes = await fetch(`/api/campaigns/${createData.campaign.id}/send`, {
        method: "POST",
      });
      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.error ?? "Send failed");

      setSuccess(`✅ Test email sent! Check DRY_RUN_EMAIL inbox. (DRY_RUN=${sendData.dryRun})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test send failed");
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>New Campaign</h1>
        <p>Compose your outreach template and select contacts</p>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: "start" }}>
        {/* Left: form */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Campaign Settings</h2>

          <div className="field">
            <label>Campaign Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. October Wholesale Outreach"
            />
          </div>

          <div className="field">
            <label>From Name</label>
            <input
              value={form.from_name}
              onChange={(e) => setForm((f) => ({ ...f, from_name: e.target.value }))}
              placeholder="Jane Smith"
            />
          </div>

          <div className="field">
            <label>From Email</label>
            <input
              type="email"
              value={form.from_email}
              onChange={(e) => setForm((f) => ({ ...f, from_email: e.target.value }))}
              placeholder="jane@yourdomain.com"
            />
          </div>

          <div className="field">
            <label>Subject Line</label>
            <input
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Email Body</label>
            <p className="text-muted" style={{ marginBottom: 6 }}>
              Variables:{" "}
              {TEMPLATE_VARS.map((v) => (
                <code
                  key={v}
                  style={{
                    background: "var(--surface2)",
                    padding: "1px 6px",
                    borderRadius: 4,
                    marginRight: 4,
                    fontSize: 12,
                  }}
                >
                  {v}
                </code>
              ))}
            </p>
            <textarea
              value={form.body_template}
              onChange={(e) => setForm((f) => ({ ...f, body_template: e.target.value }))}
              rows={12}
              style={{ fontFamily: "monospace", fontSize: 13, lineHeight: "1.6" }}
            />
          </div>

          {error && <div className="alert alert-warning">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="flex gap-3 mt-4">
            <button
              className="btn btn-secondary"
              onClick={handleTestSend}
              disabled={testSending || !form.from_email || !form.from_name}
            >
              {testSending ? <><span className="spinner" /> Sending...</> : "📧 Send Test to Myself"}
            </button>

            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating || selected.size === 0 || !form.name || !form.from_email}
            >
              {creating ? <><span className="spinner" /> Creating...</> : `Create Campaign (${selected.size} contacts)`}
            </button>
          </div>
        </div>

        {/* Right: contact selection */}
        <div className="card">
          <div className="flex flex-center gap-3 mb-4" style={{ justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Select Contacts</h2>
            <span className="text-muted">{selected.size} / {contacts.length} selected</span>
          </div>

          {contacts.length === 0 ? (
            <div className="empty-state">
              <h3>No valid contacts</h3>
              <p>Go to Leads and verify some emails first.</p>
              <a href="/leads" className="btn btn-primary" style={{ marginTop: 12 }}>
                Go to Leads
              </a>
            </div>
          ) : (
            <div className="table-wrapper" style={{ maxHeight: 520, overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selected.size === contacts.length}
                        onChange={() =>
                          setSelected(
                            selected.size === contacts.length
                              ? new Set()
                              : new Set(contacts.map((c) => c.id))
                          )
                        }
                      />
                    </th>
                    <th>Company</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => {
                            const s = new Set(selected);
                            s.has(c.id) ? s.delete(c.id) : s.add(c.id);
                            setSelected(s);
                          }}
                        />
                      </td>
                      <td>{c.lead.company_name}</td>
                      <td style={{ fontSize: 12, fontFamily: "monospace" }}>{c.email}</td>
                      <td>
                        <span className={`badge badge-${c.email_status}`}>{c.email_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
