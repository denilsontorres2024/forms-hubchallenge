type ReviewItem = {
  label: string;
  value?: string | number | null;
};

type ReviewCardProps = {
  items: ReviewItem[];
};

export function ReviewCard({ items }: ReviewCardProps) {
  const formatValue = (value: ReviewItem["value"]) => {
    if (value === undefined || value === null || value === "") return "Não informado";
    return String(value);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-hub-border bg-[#FAFAFA] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-hub-muted">{item.label}</p>
          <p className="mt-1 min-h-5 text-sm font-medium text-hub-text">{formatValue(item.value)}</p>
        </div>
      ))}
    </div>
  );
}
