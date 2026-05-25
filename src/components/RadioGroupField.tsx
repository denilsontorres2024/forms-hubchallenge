import { Check } from "lucide-react";
import { Field } from "./Field";

type Option = {
  label: string;
  value: string;
};

type RadioGroupFieldProps = {
  id: string;
  label: string;
  value?: string;
  options: Option[];
  required?: boolean;
  hint?: string;
  error?: string;
  onChange: (value: string) => void;
};

export function RadioGroupField({ id, label, value, options, required, hint, error, onChange }: RadioGroupFieldProps) {
  return (
    <Field id={id} label={label} required={required} hint={hint} error={error}>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-sm font-medium transition duration-150 ${
                selected
                  ? "border-hub-primary bg-[#FFF8E6] text-hub-text"
                  : "border-hub-border bg-white text-hub-muted hover:border-[#D6D6D6] hover:text-hub-text"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name={id}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                  selected ? "border-hub-primary bg-hub-primary text-hub-text" : "border-[#D5D5D5] bg-white"
                }`}
                aria-hidden="true"
              >
                {selected ? <Check className="h-3 w-3" /> : null}
              </span>
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </Field>
  );
}
