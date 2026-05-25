import { AlertCircle } from "lucide-react";
import { forwardRef } from "react";

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
};

export function Field({ id, label, required, hint, error, children }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-hub-text">
        {label}
        {required ? <span className="ml-1 text-hub-error" aria-label="obrigatório">*</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="mt-2 text-xs leading-5 text-hub-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-hub-error" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

export const TextInput = forwardRef<HTMLInputElement, InputProps>(function TextInput({ hasError, className = "", ...props }, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={`h-12 w-full rounded-md border bg-white px-3.5 text-sm text-hub-text placeholder:text-hub-placeholder transition duration-150 hover:border-[#D6D6D6] focus:border-hub-primary disabled:cursor-not-allowed disabled:bg-[#FAFAFA] disabled:text-hub-muted ${
        hasError ? "border-hub-error" : "border-hub-border"
      } ${className}`}
    />
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ hasError, className = "", ...props }, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={`min-h-32 w-full resize-y rounded-md border bg-white px-3.5 py-3 text-sm leading-6 text-hub-text placeholder:text-hub-placeholder transition duration-150 hover:border-[#D6D6D6] focus:border-hub-primary ${
        hasError ? "border-hub-error" : "border-hub-border"
      } ${className}`}
    />
  );
});
