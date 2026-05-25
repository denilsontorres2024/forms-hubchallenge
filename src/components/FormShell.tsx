import { motion } from "framer-motion";
import { BrandMark } from "./BrandMark";
import { EventInfoCard } from "./EventInfoCard";

type FormShellProps = {
  title: string;
  subtitle: string;
  description: string[];
  children: React.ReactNode;
};

export function FormShell({ title, subtitle, description, children }: FormShellProps) {
  return (
    <main className="min-h-screen bg-hub-background px-4 py-6 text-hub-text sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-5xl"
      >
        <header className="mb-8 rounded-lg border border-hub-border bg-white p-5 shadow-panel sm:p-7">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <BrandMark />
              <div className="mt-8 max-w-3xl">
                <p className="mb-3 text-sm font-medium text-hub-muted">{subtitle}</p>
                <h1 className="text-3xl font-semibold tracking-[0] text-hub-text sm:text-4xl">{title}</h1>
                <div className="mt-5 space-y-3 text-sm leading-6 text-hub-muted sm:text-base">
                  {description.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="mb-8">
          <EventInfoCard />
        </div>
        {children}
      </motion.div>
    </main>
  );
}
