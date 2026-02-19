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
  const [touched, setTouched] = useState<Record<keyof CreateClaimInput, boolean>>({
    lob: false,
    policyNumber: false,
    insuredName: false,
    lossDate: false,
    lossType: false,
    description: false,
    contactEmail: false,
    priority: false,
  });

  const errors = validateForm(form);

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
    setTouched({
      lob: true,
      policyNumber: true,
      insuredName: true,
      lossDate: true,
      lossType: true,
      description: true,
      contactEmail: true,
      priority: true,
    });

    if (Object.values(errors).some(Boolean)) {
      return;
    }

    try {
      setSaving(true);
      const created = await createClaim(form);
      setClaims((prev) => [created, ...prev]);
      setForm(initialForm);
      setTouched({
        lob: false,
        policyNumber: false,
        insuredName: false,
        lossDate: false,
        lossType: false,
        description: false,
        contactEmail: false,
        priority: false,
      });
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
              className={touched.policyNumber && errors.policyNumber ? "invalid-input" : ""}
              value={form.policyNumber}
              onBlur={() => setTouched((t) => ({ ...t, policyNumber: true }))}
              onChange={(e) => setForm((f) => ({ ...f, policyNumber: e.target.value }))}
            />
            {touched.policyNumber && errors.policyNumber && (
              <small className="field-error">{errors.policyNumber}</small>
            )}
          </label>

          <label>
            Insured name
            <input
              required
              className={touched.insuredName && errors.insuredName ? "invalid-input" : ""}
              value={form.insuredName}
              onBlur={() => setTouched((t) => ({ ...t, insuredName: true }))}
              onChange={(e) => setForm((f) => ({ ...f, insuredName: e.target.value }))}
            />
            {touched.insuredName && errors.insuredName && (
              <small className="field-error">{errors.insuredName}</small>
            )}
          </label>

          <label>
            Loss date
            <input
              required
              type="date"
              className={touched.lossDate && errors.lossDate ? "invalid-input" : ""}
              value={form.lossDate}
              onBlur={() => setTouched((t) => ({ ...t, lossDate: true }))}
              onChange={(e) => setForm((f) => ({ ...f, lossDate: e.target.value }))}
            />
            {touched.lossDate && errors.lossDate && (
              <small className="field-error">{errors.lossDate}</small>
            )}
          </label>

          <label>
            Loss type
            <input
              required
              className={touched.lossType && errors.lossType ? "invalid-input" : ""}
              value={form.lossType}
              onBlur={() => setTouched((t) => ({ ...t, lossType: true }))}
              onChange={(e) => setForm((f) => ({ ...f, lossType: e.target.value }))}
            />
            {touched.lossType && errors.lossType && (
              <small className="field-error">{errors.lossType}</small>
            )}
          </label>

          <label>
            Contact email
            <input
              required
              type="email"
              className={touched.contactEmail && errors.contactEmail ? "invalid-input" : ""}
              value={form.contactEmail}
              onBlur={() => setTouched((t) => ({ ...t, contactEmail: true }))}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
            {touched.contactEmail && errors.contactEmail && (
              <small className="field-error">{errors.contactEmail}</small>
            )}
          </label>

          <label className="full-width">
            Description
            <textarea
              required
              rows={4}
              className={touched.description && errors.description ? "invalid-input" : ""}
              value={form.description}
              onBlur={() => setTouched((t) => ({ ...t, description: true }))}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            {touched.description && errors.description && (
              <small className="field-error">{errors.description}</small>
            )}
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

function validateForm(form: CreateClaimInput): Partial<Record<keyof CreateClaimInput, string>> {
  const errors: Partial<Record<keyof CreateClaimInput, string>> = {};

  if (!form.policyNumber.trim()) errors.policyNumber = "This field is required.";
  else if (form.policyNumber.trim().length < 3) errors.policyNumber = "Must be at least 3 characters.";

  if (!form.insuredName.trim()) errors.insuredName = "This field is required.";
  else if (form.insuredName.trim().length < 2) errors.insuredName = "Must be at least 2 characters.";

  if (!form.lossDate) errors.lossDate = "This field is required.";
  else {
    const lossDate = new Date(form.lossDate + "T00:00:00Z");
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (lossDate > today) errors.lossDate = "Loss date cannot be in the future.";
  }

  if (!form.lossType.trim()) errors.lossType = "This field is required.";
  else if (form.lossType.trim().length < 2) errors.lossType = "Must be at least 2 characters.";

  if (!form.description.trim()) errors.description = "This field is required.";
  else if (form.description.trim().length < 5) errors.description = "Must be at least 5 characters.";

  if (!form.contactEmail.trim()) errors.contactEmail = "This field is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
    errors.contactEmail = "Enter a valid email address.";
  }

  return errors;
}
