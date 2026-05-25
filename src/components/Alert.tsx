import { AlertTriangle, Info } from "lucide-react";

type AlertProps = {
  tone?: "info" | "warning";
  children: React.ReactNode;
};

export function Alert({ tone = "info", children }: AlertProps) {
  const Icon = tone === "warning" ? AlertTriangle : Info;

  return (
    <div
      className={`flex gap-3 rounded-md border p-4 text-sm leading-6 ${
        tone === "warning" ? "border-[#F8DCA4] bg-[#FFF8E9] text-[#7A4B02]" : "border-hub-border bg-[#FAFAFA] text-hub-muted"
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "warning" ? "text-hub-warning" : "text-hub-muted"}`} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
