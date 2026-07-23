import type { ReactNode } from 'react';

// ---- Field wrapper ----
export function Field({
  label,
  required,
  hint,
  example,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  example?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label">
        {label} {required && <span className="req">*</span>}
      </label>
      {hint && <p className="hint">{hint}</p>}
      {children}
      {example && <p className="hint hint-eg">ตัวอย่าง: {example}</p>}
    </div>
  );
}

// ---- Radio (เลือก 1) ----
export function RadioGroup({
  label,
  required,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} required={required} hint={hint}>
      <div className="option-list">
        {options.map((opt) => (
          <label key={opt} className={`option ${value === opt ? 'selected' : ''}`}>
            <input
              type="radio"
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </Field>
  );
}

// ---- Checkbox (เลือกหลายตัว) ----
export function CheckboxGroup({
  label,
  required,
  hint,
  options,
  values,
  onChange,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  }
  return (
    <Field label={label} required={required} hint={hint}>
      <div className="option-list">
        {options.map((opt) => (
          <label key={opt} className={`option ${values.includes(opt) ? 'selected' : ''}`}>
            <input type="checkbox" checked={values.includes(opt)} onChange={() => toggle(opt)} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </Field>
  );
}

// ---- Ranking (คลิกเพื่อเรียงลำดับความสนใจ) ----
export function RankSelect({
  label,
  required,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  }
  return (
    <Field label={label} required={required} hint={hint || 'คลิกเพื่อเลือก — ลำดับการคลิกคืออันดับความสนใจ (คลิกซ้ำเพื่อยกเลิก)'}>
      <div className="option-list">
        {options.map((opt) => {
          const idx = value.indexOf(opt);
          return (
            <div
              key={opt}
              className={`option ${idx >= 0 ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => toggle(opt)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(opt);
                }
              }}
            >
              <span className={`rank-badge ${idx >= 0 ? 'on' : ''}`}>{idx >= 0 ? idx + 1 : ''}</span>
              <span>{opt}</span>
            </div>
          );
        })}
      </div>
    </Field>
  );
}
