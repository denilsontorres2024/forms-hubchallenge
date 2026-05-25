import { motion } from "framer-motion";

type FormSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function FormSection({ eyebrow, title, description, children }: FormSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-lg border border-hub-border bg-white p-5 shadow-panel sm:p-7"
    >
      <div className="mb-6 border-b border-hub-border pb-5">
        {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-hub-muted">{eyebrow}</p> : null}
        <h2 className="text-xl font-semibold tracking-[0] text-hub-text">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-hub-muted">{description}</p> : null}
      </div>
      {children}
    </motion.section>
  );
}
