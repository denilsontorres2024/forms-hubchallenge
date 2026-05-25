import { ArrowRight, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";
import { BrandMark } from "../components/BrandMark";
import { EventInfoCard } from "../components/EventInfoCard";

const options = [
  {
    title: "Sou finalista",
    description: "Confirmar presença no evento final e cadastrar convidado, se desejar.",
    href: "/confirmacao-finalistas",
    icon: Trophy,
  },
  {
    title: "Não sou finalista",
    description: "Manifestar interesse em participar presencialmente, sujeito à disponibilidade de vagas.",
    href: "/interesse-presencial",
    icon: Users,
  },
];

export function HomePage() {
  return (
    <main className="min-h-screen bg-hub-background px-4 py-6 text-hub-text sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-5xl"
      >
        <header className="mb-8 rounded-lg border border-hub-border bg-white p-5 shadow-panel sm:p-7">
          <BrandMark />
          <div className="mt-8 max-w-3xl">
            <p className="mb-3 text-sm font-medium text-hub-muted">Evento final do HUB Innovation Challenge</p>
            <h1 className="text-3xl font-semibold tracking-[0] text-hub-text sm:text-4xl">Escolha o formulário correto</h1>
            <p className="mt-5 text-sm leading-6 text-hub-muted sm:text-base">
              Para direcionar sua inscrição, informe se você é finalista do HUB Innovation Challenge ou se deseja registrar interesse em participar presencialmente.
            </p>
          </div>
        </header>

        <div className="mb-8">
          <EventInfoCard />
        </div>

        <section className="grid gap-4 md:grid-cols-2" aria-label="Escolha do tipo de participante">
          {options.map((option, index) => {
            const Icon = option.icon;

            return (
              <motion.a
                key={option.href}
                href={option.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group rounded-lg border border-hub-border bg-white p-6 shadow-panel transition duration-150 hover:-translate-y-0.5 hover:border-[#D6D6D6] hover:shadow-[0_18px_52px_rgba(17,17,17,0.07)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(255,176,0,0.18)] sm:p-7"
              >
                <div className="mb-7 flex items-start justify-between gap-5">
                  <div className="grid h-12 w-12 place-items-center rounded-md bg-[#FFF8E6] text-hub-hover">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-hub-border text-hub-muted transition group-hover:border-hub-primary group-hover:text-hub-text">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <h2 className="text-2xl font-semibold tracking-[0] text-hub-text">{option.title}</h2>
                <p className="mt-3 text-sm leading-6 text-hub-muted">{option.description}</p>
              </motion.a>
            );
          })}
        </section>
      </motion.div>
    </main>
  );
}
