import { useEffect, useState, type FormEvent } from "react";
import { LOBS, PRIORITIES, type Claim, type Lob, type Priority } from "@hanover/shared";
import { createClaim, fetchClaims, type CreateClaimInput } from "./api";

const initialForm: CreateClaimInput = {
  lob: LOBS[0],
  policyNumber: "",
  insuredName: "",
  lossDate: "",
  lossType: "",
  description: "",
  contactEmail: "",
  priority: PRIORITIES[1],
};

export function App() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateClaimInput>(initialForm);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setLoading(true);
        const items = await fetchClaims();
        if (!ignore) setClaims(items);
      } catch (e) {
        if (!ignore) setError((e as Error).message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      setSaving(true);
      const created = await createClaim(form);
      setClaims((prev) => [created, ...prev]);
      setForm(initialForm);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <h1>Hanover Claims (React)</h1>

      <section className="panel">
        <h2>Create claim</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Line of business
            <select
              value={form.lob}
              onChange={(e) => setForm((f) => ({ ...f, lob: e.target.value as Lob }))}
            >
              {LOBS.map((lob) => (
                <option key={lob} value={lob}>
                  {lob}
                </option>
              ))}
            </select>
          </label>

          <label>
            Priority
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label>
            Policy #
            <input
              required
              value={form.policyNumber}
              onChange={(e) => setForm((f) => ({ ...f, policyNumber: e.target.value }))}
            />
          </label>

          <label>
            Insured name
            <input
              required
              value={form.insuredName}
              onChange={(e) => setForm((f) => ({ ...f, insuredName: e.target.value }))}
            />
          </label>

          <label>
            Loss date
            <input
              required
              type="date"
              value={form.lossDate}
              onChange={(e) => setForm((f) => ({ ...f, lossDate: e.target.value }))}
            />
          </label>

          <label>
            Loss type
            <input
              required
              value={form.lossType}
              onChange={(e) => setForm((f) => ({ ...f, lossType: e.target.value }))}
            />
          </label>

          <label>
            Contact email
            <input
              required
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
          </label>

          <label className="full-width">
            Description
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>

          <button disabled={saving} type="submit">
            {saving ? "Submitting..." : "Submit claim"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Recent claims</h2>
        {loading && <p>Loading...</p>}
        {!loading && claims.length === 0 && <p>No claims yet.</p>}
        {!loading && claims.length > 0 && (
          <ul className="claim-list">
            {claims.map((claim) => (
              <li key={claim.id}>
                <strong>{claim.claimNumber}</strong>
                <span>{claim.insuredName}</span>
                <span>
                  {claim.lob} | {claim.status} | {claim.priority}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
