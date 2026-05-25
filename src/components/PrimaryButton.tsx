import { Loader2 } from "lucide-react";

type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export function PrimaryButton({ loading, children, disabled, ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-hub-primary px-5 text-sm font-semibold text-hub-text transition duration-150 hover:bg-hub-hover disabled:cursor-not-allowed disabled:bg-[#E3E3E3] disabled:text-hub-muted sm:w-auto"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
