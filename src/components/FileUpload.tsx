import { useRef, useState } from 'react';

interface Props {
  label: string;
  accept?: string;
  maxBytes: number;
  multiple?: boolean;
  required?: boolean;
  onChange: (files: File[]) => void;
  hint?: string;
}

// ปุ่มเลือกไฟล์ + validate ขนาดที่ frontend (gotcha ข้อ 2: base64 payload โต ~33%)
export default function FileUpload({
  label,
  accept = '.pdf',
  maxBytes,
  multiple = false,
  required = false,
  onChange,
  hint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState('');

  const mb = Math.round(maxBytes / (1024 * 1024));

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    const selected = Array.from(e.target.files || []);
    const tooBig = selected.find((f) => f.size > maxBytes);
    if (tooBig) {
      setError(`ไฟล์ "${tooBig.name}" ใหญ่เกิน ${mb}MB`);
      setNames([]);
      onChange([]);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setNames(selected.map((f) => f.name));
    onChange(selected);
  }

  return (
    <div className="field">
      <label className="field-label">
        {label} {required && <span className="req">*</span>}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handle}
        className="file-input"
      />
      {hint && <p className="hint">{hint} (สูงสุด {mb}MB)</p>}
      {names.length > 0 && (
        <ul className="file-names">
          {names.map((n) => (
            <li key={n}>📎 {n}</li>
          ))}
        </ul>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
