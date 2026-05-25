import { CalendarDays, Clock3, MapPin } from "lucide-react";

const items = [
  {
    icon: CalendarDays,
    label: "Data",
    value: "18 de Junho",
  },
  {
    icon: Clock3,
    label: "Horário",
    value: "A partir das 19h",
  },
  {
    icon: MapPin,
    label: "Local Presencial",
    value: "Sede do Grupo Primo\nAvenida Copacabana, 325 - 21º andar\nAlphaville, Barueri/SP",
  },
];

export function EventInfoCard() {
  return (
    <section className="rounded-lg border border-hub-border bg-hub-card p-5 shadow-panel sm:p-6" aria-labelledby="event-info-title">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="event-info-title" className="text-base font-semibold text-hub-text">
          Informações do Evento
        </h2>
        <span className="rounded-full border border-hub-border bg-[#FAFAFA] px-3 py-1 text-xs font-medium text-hub-muted">
          Evento final
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-[0.85fr_0.9fr_1.5fr]">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-md border border-hub-border bg-white p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-[#FFF8E6] text-hub-hover">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-hub-muted">{item.label}</p>
              <p className="mt-1 whitespace-pre-line text-sm font-medium leading-6 text-hub-text">{item.value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
