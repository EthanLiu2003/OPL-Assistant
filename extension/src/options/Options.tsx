import { useEffect, useState } from 'react';
import { useProfile } from '@/profile/store';
import type { DisplayUnit, Sex, Equipment, Federation } from '@/lib/types';
import {
  EQUIPMENT_OPTIONS,
  FEDERATION_OPTIONS,
  SEX_OPTIONS,
  getWeightClasses,
} from '@/profile/schema';
import { parseWeight, resolveToKg, toLb } from '@/lib/units';

type FormState = {
  bodyweight: string;
  bodyweightUnit: DisplayUnit;
  age: string;
  sex: Sex;
  equipment: Equipment;
  federation: Federation;
  weightClass: string;
  currentTotal: string;
  currentTotalUnit: DisplayUnit;
  locationZip: string;
  displayUnit: DisplayUnit;
};

const emptyForm: FormState = {
  bodyweight: '',
  bodyweightUnit: 'kg',
  age: '',
  sex: 'M',
  equipment: 'Raw',
  federation: 'USAPL',
  weightClass: '83',
  currentTotal: '',
  currentTotalUnit: 'kg',
  locationZip: '',
  displayUnit: 'kg',
};

export const Options = () => {
  const { profile, loaded, load, save, clear } = useProfile();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!profile) return;
    const displayUnit: DisplayUnit = profile.extras?.display_unit ?? 'kg';
    setForm({
      bodyweight:
        profile.bodyweightKg != null
          ? displayUnit === 'kg'
            ? profile.bodyweightKg.toFixed(1)
            : toLb(profile.bodyweightKg, 'kg').toFixed(0)
          : '',
      bodyweightUnit: displayUnit,
      age: profile.ageYears?.toString() ?? '',
      sex: profile.sex ?? 'M',
      equipment: profile.equipment ?? 'Raw',
      federation: profile.federations?.[0] ?? 'USAPL',
      weightClass: profile.weightClass ?? '83',
      currentTotal:
        profile.currentTotalKg != null
          ? displayUnit === 'kg'
            ? profile.currentTotalKg.toFixed(0)
            : toLb(profile.currentTotalKg, 'kg').toFixed(0)
          : '',
      currentTotalUnit: displayUnit,
      locationZip: profile.locationZip ?? '',
      displayUnit,
    });
  }, [profile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const weightClasses = getWeightClasses(form.federation, form.sex);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (weightClasses.includes(form.weightClass)) return;
    const current = Number.parseFloat(form.weightClass);
    if (!Number.isFinite(current)) {
      setForm((f) => ({ ...f, weightClass: weightClasses[0] }));
      return;
    }
    const nearest = [...weightClasses].sort((a, b) => {
      const na = Number.parseFloat(a);
      const nb = Number.parseFloat(b);
      return Math.abs(na - current) - Math.abs(nb - current);
    })[0];
    setForm((f) => ({ ...f, weightClass: nearest }));
  }, [form.federation, form.sex, form.weightClass, weightClasses]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async () => {
    const bwParsed = form.bodyweight ? parseWeight(form.bodyweight) : null;
    const totalParsed = form.currentTotal ? parseWeight(form.currentTotal) : null;
    const bwKg = bwParsed ? resolveToKg(bwParsed, form.bodyweightUnit) : undefined;
    const totalKg = totalParsed
      ? resolveToKg(totalParsed, form.currentTotalUnit)
      : undefined;

    await save({
      sex: form.sex,
      ageYears: form.age ? Number.parseInt(form.age, 10) : undefined,
      bodyweightKg: bwKg,
      weightClass: form.weightClass,
      equipment: form.equipment,
      federations: [form.federation],
      currentTotalKg: totalKg,
      locationZip: form.locationZip || undefined,
      extras: { display_unit: form.displayUnit },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = async () => {
    if (confirm('Clear all OPL Assistant data on this device?')) {
      await clear();
      setForm(emptyForm);
    }
  };

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-opl-bg text-opl-text flex justify-center py-10 px-5">
      <div className="w-full max-w-[480px]">
        <header className="mb-8">
          <div className="flex items-center gap-[6px] mb-1">
            <span className="text-[14px] font-semibold text-opl-accent">OPL</span>
            <span className="text-[14px]">Coach Settings</span>
          </div>
          <p className="text-[11px] text-opl-muted">
            Configure your profile and preferences.
          </p>
        </header>

        <Section title="Preferences">
          <div className="field">
            <label>Display unit</label>
            <select
              value={form.displayUnit}
              onChange={(e) =>
                setForm({ ...form, displayUnit: e.target.value as DisplayUnit })
              }
              className="field-input"
            >
              <option value="kg">kg (kilograms)</option>
              <option value="lb">lb (pounds)</option>
            </select>
          </div>
        </Section>

        <Section title="Profile">
          <div className="grid grid-cols-2 gap-[10px]">
            <Field label="Bodyweight">
              <div className="flex gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={form.bodyweightUnit === 'kg' ? '83.0' : '183'}
                  value={form.bodyweight}
                  onChange={(e) =>
                    setForm({ ...form, bodyweight: e.target.value })
                  }
                  className="field-input flex-1"
                />
                <UnitToggle
                  value={form.bodyweightUnit}
                  onChange={(unit) => {
                    // Convert the currently typed value so the user isn't confused.
                    const parsed = parseWeight(form.bodyweight);
                    if (parsed) {
                      const kg = resolveToKg(parsed, form.bodyweightUnit);
                      const next =
                        unit === 'kg'
                          ? kg.toFixed(1)
                          : toLb(kg, 'kg').toFixed(0);
                      setForm({ ...form, bodyweight: next, bodyweightUnit: unit });
                    } else {
                      setForm({ ...form, bodyweightUnit: unit });
                    }
                  }}
                />
              </div>
            </Field>
            <Field label="Age">
              <input
                type="number"
                placeholder="24"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="field-input"
              />
            </Field>
            <Field label="Sex">
              <select
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })}
                className="field-input"
              >
                {SEX_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Equipment">
              <select
                value={form.equipment}
                onChange={(e) =>
                  setForm({ ...form, equipment: e.target.value as Equipment })
                }
                className="field-input"
              >
                {EQUIPMENT_OPTIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Federation">
              <select
                value={form.federation}
                onChange={(e) =>
                  setForm({ ...form, federation: e.target.value as Federation })
                }
                className="field-input"
              >
                {FEDERATION_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Weight class (kg)">
              <select
                value={form.weightClass}
                onChange={(e) =>
                  setForm({ ...form, weightClass: e.target.value })
                }
                className="field-input"
              >
                {weightClasses.map((wc) => (
                  <option key={wc} value={wc}>
                    {wc}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Current total">
              <div className="flex gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={form.currentTotalUnit === 'kg' ? '615' : '1355'}
                  value={form.currentTotal}
                  onChange={(e) =>
                    setForm({ ...form, currentTotal: e.target.value })
                  }
                  className="field-input flex-1"
                />
                <UnitToggle
                  value={form.currentTotalUnit}
                  onChange={(unit) => {
                    const parsed = parseWeight(form.currentTotal);
                    if (parsed) {
                      const kg = resolveToKg(parsed, form.currentTotalUnit);
                      const next =
                        unit === 'kg'
                          ? kg.toFixed(0)
                          : toLb(kg, 'kg').toFixed(0);
                      setForm({
                        ...form,
                        currentTotal: next,
                        currentTotalUnit: unit,
                      });
                    } else {
                      setForm({ ...form, currentTotalUnit: unit });
                    }
                  }}
                />
              </div>
            </Field>
            <Field label="Location (ZIP)">
              <input
                type="text"
                placeholder="Optional"
                value={form.locationZip}
                onChange={(e) =>
                  setForm({ ...form, locationZip: e.target.value })
                }
                className="field-input"
              />
            </Field>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={handleSave} className="btn-primary">
              Save profile
            </button>
            {saved && (
              <span className="text-[11px] text-opl-muted">Saved locally.</span>
            )}
          </div>
        </Section>

        <Section title="Privacy">
          <div className="text-[11px] text-opl-muted leading-relaxed p-[10px] rounded bg-opl-surface/50">
            Your profile lives in <code className="font-mono text-opl-text">chrome.storage.local</code> on
            this device. Cloud sync is off until you sign in. Ad-hoc queries, browsing,
            and derived card values are never transmitted.
          </div>
          <button
            onClick={handleClear}
            className="mt-2 text-[11px] text-opl-accent hover:underline"
          >
            Clear all data on this device
          </button>
        </Section>

        <hr className="border-t border-opl-border my-5" />
        <p className="text-[10px] text-opl-muted">
          Data provided by{' '}
          <a
            href="https://www.openpowerlifting.org"
            target="_blank"
            rel="noreferrer"
            className="text-opl-info"
          >
            openpowerlifting.org
          </a>
          .
        </p>
      </div>
      <style>{`
        .field label { display:block; font-size:9px; text-transform:uppercase; letter-spacing:0.1em; color:#666680; margin-bottom:4px; }
        .field-input { width:100%; background:rgba(30,30,42,0.5); border:1px solid #1e1e2a; border-radius:4px; padding:6px 10px; font-size:13px; color:#c8c8d0; outline:none; font-family:inherit; }
        .field-input:focus { border-color:rgba(224,80,80,0.5); }
        select.field-input { appearance:none; }
        .btn-primary { padding:8px 16px; border:none; border-radius:4px; background:#e05050; color:#fff; font-size:12px; font-weight:500; cursor:pointer; }
        .btn-primary:hover { background:#c94040; }
      `}</style>
    </div>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="mb-7">
    <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-opl-accent mb-3">
      {title}
    </h2>
    {children}
  </section>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="field">
    <label>{label}</label>
    {children}
  </div>
);

const UnitToggle = ({
  value,
  onChange,
}: {
  value: DisplayUnit;
  onChange: (unit: DisplayUnit) => void;
}) => (
  <div className="flex border border-opl-border rounded overflow-hidden">
    {(['kg', 'lb'] as const).map((u) => (
      <button
        key={u}
        type="button"
        onClick={() => onChange(u)}
        className={`px-2 text-[11px] ${
          value === u
            ? 'bg-opl-accent text-white'
            : 'bg-transparent text-opl-muted hover:text-opl-text'
        }`}
      >
        {u}
      </button>
    ))}
  </div>
);
