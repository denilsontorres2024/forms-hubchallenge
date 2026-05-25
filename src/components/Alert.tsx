import { AlertTriangle, Info } from "lucide-react";

type AlertProps = {
  tone?: "info" | "warning" | "error";
  children: React.ReactNode;
};

export function Alert({ tone = "info", children }: AlertProps) {
  const Icon = tone === "info" ? Info : AlertTriangle;
  const toneClass =
    tone === "error"
      ? "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
      : tone === "warning"
        ? "border-[#F8DCA4] bg-[#FFF8E9] text-[#7A4B02]"
        : "border-hub-border bg-[#FAFAFA] text-hub-muted";
  const iconClass = tone === "error" ? "text-hub-error" : tone === "warning" ? "text-hub-warning" : "text-hub-muted";

  return (
    <div className={`flex gap-3 rounded-md border p-4 text-sm leading-6 ${toneClass}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
