import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { BrandMark } from "./BrandMark";
import { EventInfoCard } from "./EventInfoCard";

type SuccessStateProps = {
  title: string;
  message: string;
};

export function SuccessState({ title, message }: SuccessStateProps) {
  return (
    <main className="min-h-screen bg-hub-background px-4 py-6 text-hub-text sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-3xl"
      >
        <div className="mb-8 rounded-lg border border-hub-border bg-white p-5 shadow-panel sm:p-7">
          <BrandMark />
        </div>
        <section className="rounded-lg border border-hub-border bg-white p-8 text-center shadow-panel sm:p-10">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[#ECFDF3] text-hub-success">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-[0] text-hub-text">{title}</h1>
          <p className="mx-auto mt-3 max-w-xl whitespace-pre-line text-sm leading-6 text-hub-muted sm:text-base">{message}</p>
        </section>
        <div className="mt-8">
          <EventInfoCard />
        </div>
      </motion.div>
    </main>
  );
}
