import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { isCompleteCpf, isCompletePhone, maskCpf, maskPhone } from "../utils/masks";
import { Alert } from "../components/Alert";
import { Field, Textarea, TextInput } from "../components/Field";
import { FormSection } from "../components/FormSection";
import { FormShell } from "../components/FormShell";
import { PrimaryButton } from "../components/PrimaryButton";
import { RadioGroupField } from "../components/RadioGroupField";
import { ReviewCard } from "../components/ReviewCard";
import { SuccessState } from "../components/SuccessState";
import { saveSubmission } from "../services/submissions";

const interestSchema = z
  .object({
    fullName: z.string().trim().min(3, "Informe seu nome completo."),
    teamNumber: z.string().optional(),
    whatsapp: z.string().refine(isCompletePhone, "Informe um WhatsApp válido no formato (00) 00000-0000."),
    email: z.string().trim().email("Informe um e-mail válido."),
    wantsToAttendInPerson: z.string().min(1, "Selecione uma opção."),
    cpf: z.string().optional(),
    wantsGuests: z.string().optional(),
    guestQuantity: z.number().optional(),
    guests: z.array(
      z.object({
        fullName: z.string().trim().min(3, "Informe o nome completo do convidado."),
        cpf: z.string().optional(),
        whatsapp: z.string().optional(),
      }),
    ),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.wantsToAttendInPerson === "Sim") {
      if (!isCompleteCpf(data.cpf)) {
        ctx.addIssue({ code: "custom", path: ["cpf"], message: "Informe seu CPF para credenciamento." });
      }
      if (!data.wantsGuests) {
        ctx.addIssue({ code: "custom", path: ["wantsGuests"], message: "Selecione uma opção." });
      }
      if (data.wantsGuests === "Sim") {
        if (!data.guestQuantity || data.guestQuantity < 1) {
          ctx.addIssue({ code: "custom", path: ["guestQuantity"], message: "Informe a quantidade de convidados." });
        }
        if (data.guestQuantity && data.guests.length < data.guestQuantity) {
          ctx.addIssue({ code: "custom", path: ["guests"], message: "Complete a lista de convidados." });
        }
      }
    }

    data.guests.forEach((guest, index) => {
      if (guest.cpf && !isCompleteCpf(guest.cpf)) {
        ctx.addIssue({ code: "custom", path: ["guests", index, "cpf"], message: "Confira o CPF informado." });
      }
      if (guest.whatsapp && !isCompletePhone(guest.whatsapp)) {
        ctx.addIssue({ code: "custom", path: ["guests", index, "whatsapp"], message: "Confira o WhatsApp informado." });
      }
    });
  });

type InterestFormValues = z.infer<typeof interestSchema>;

const defaultValues: InterestFormValues = {
  fullName: "",
  teamNumber: "",
  whatsapp: "",
  email: "",
  wantsToAttendInPerson: "",
  cpf: "",
  wantsGuests: "",
  guestQuantity: undefined,
  guests: [],
  reason: "",
};

export function InterestPresencePage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InterestFormValues>({
    resolver: zodResolver(interestSchema),
    defaultValues,
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "guests" });
  const [fullName, teamNumber, wantsToAttendInPerson, wantsGuestsAnswer, guestQuantity, reason] = watch([
    "fullName",
    "teamNumber",
    "wantsToAttendInPerson",
    "wantsGuests",
    "guestQuantity",
    "reason",
  ]);
  const wantsToAttend = wantsToAttendInPerson === "Sim";
  const doesNotWantToAttend = wantsToAttendInPerson === "Não";
  const wantsGuests = wantsGuestsAnswer === "Sim";
  const quantity = Number(guestQuantity || 0);

  useEffect(() => {
    if (!wantsGuests) return;
    const target = Math.max(0, Math.min(Number.isFinite(quantity) ? quantity : 0, 10));
    if (target > fields.length) {
      Array.from({ length: target - fields.length }).forEach(() => append({ fullName: "", cpf: "", whatsapp: "" }));
    }
    if (target < fields.length) {
      for (let index = fields.length - 1; index >= target; index -= 1) {
        remove(index);
      }
    }
  }, [append, fields.length, quantity, remove, wantsGuests]);

  const reviewItems = useMemo(
    () => [
      { label: "Participante", value: fullName },
      { label: "Time", value: teamNumber },
      { label: "Interesse presencial", value: wantsToAttendInPerson },
      { label: "Convidados", value: wantsGuests ? quantity : "Não" },
      { label: "Motivação", value: reason ? "Preenchida" : "Não informada" },
    ],
    [fullName, quantity, reason, teamNumber, wantsToAttendInPerson, wantsGuests],
  );

  async function onSubmit(data: InterestFormValues) {
    setLoading(true);
    setSubmitError("");
    const payload = {
      formType: "interest_request",
      fullName: data.fullName,
      teamNumber: data.teamNumber || "",
      whatsapp: data.whatsapp,
      email: data.email,
      wantsToAttendInPerson: data.wantsToAttendInPerson === "Sim",
      cpf: data.wantsToAttendInPerson === "Sim" ? data.cpf || "" : "",
      wantsGuests: data.wantsToAttendInPerson === "Sim" && data.wantsGuests === "Sim",
      guests: data.wantsToAttendInPerson === "Sim" && data.wantsGuests === "Sim" ? data.guests : [],
      reason: data.reason || "",
      status: "interest_pending",
    };

    try {
      await saveSubmission(payload);
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Não foi possível salvar seu interesse. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <SuccessState
        title="Seu interesse foi registrado."
        message={"Caso haja disponibilidade de vagas, a organização entrará em contato pelos canais informados."}
      />
    );
  }

  return (
    <FormShell
      title="Interesse em Participar Presencialmente"
      subtitle="Evento final do HUB Innovation Challenge"
      description={[
        "Este formulário representa apenas interesse em participar presencialmente do evento final do HUB Innovation Challenge.",
        "O preenchimento não garante presença no evento.",
        "A organização realizará uma validação conforme disponibilidade de vagas e enviará a confirmação posteriormente.",
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <FormSection eyebrow="Dados pessoais" title="Dados pessoais" description="Informe os dados que serão usados para contato e validação.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="fullName"
              render={({ field }) => (
                <Field id="fullName" label="Nome completo" required error={errors.fullName?.message}>
                  <TextInput
                    id="fullName"
                    name={field.name}
                    placeholder="Digite seu nome completo"
                    autoComplete="name"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    ref={field.ref}
                    hasError={!!errors.fullName}
                  />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="teamNumber"
              render={({ field }) => (
                <Field id="teamNumber" label="Número do time" hint="Caso não saiba o número do time, deixe em branco." error={errors.teamNumber?.message}>
                  <TextInput
                    id="teamNumber"
                    name={field.name}
                    placeholder="Ex: 2"
                    autoComplete="off"
                    value={field.value || ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    ref={field.ref}
                    hasError={!!errors.teamNumber}
                  />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="whatsapp"
              render={({ field }) => (
                <Field id="whatsapp" label="WhatsApp" required error={errors.whatsapp?.message}>
                  <TextInput
                    id="whatsapp"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(maskPhone(event.target.value))}
                    hasError={!!errors.whatsapp}
                  />
                </Field>
              )}
            />
            <Field id="email" label="E-mail" required error={errors.email?.message}>
              <TextInput id="email" type="email" placeholder="voce@email.com" autoComplete="email" hasError={!!errors.email} {...register("email")} />
            </Field>
          </div>
        </FormSection>

        <FormSection eyebrow="Interesse presencial" title="Interesse presencial" description="A presença será validada pela organização conforme disponibilidade de vagas.">
          <div className="space-y-5">
            <Controller
              control={control}
              name="wantsToAttendInPerson"
              render={({ field }) => (
                <RadioGroupField
                  id="wantsToAttendInPerson"
                  label="Você gostaria de participar presencialmente do evento?"
                  required
                  options={[
                    { label: "Sim", value: "Sim" },
                    { label: "Não", value: "Não" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.wantsToAttendInPerson?.message}
                />
              )}
            />
            <AnimatePresence>
              {wantsToAttend ? (
                <motion.div className="grid gap-5 sm:grid-cols-2" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <Controller
                    control={control}
                    name="cpf"
                    render={({ field }) => (
                      <Field id="cpf" label="CPF" required hint="Utilizado apenas para credenciamento e controle do evento." error={errors.cpf?.message}>
                        <TextInput
                          id="cpf"
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={(event) => field.onChange(maskCpf(event.target.value))}
                          hasError={!!errors.cpf}
                        />
                      </Field>
                    )}
                  />
                  <div className="sm:col-span-2">
                    <Controller
                      control={control}
                      name="wantsGuests"
                      render={({ field }) => (
                        <RadioGroupField
                          id="wantsGuests"
                          label="Você gostaria de levar convidados?"
                          required
                          hint="A solicitação de convidados não garante presença."
                          options={[
                            { label: "Sim", value: "Sim" },
                            { label: "Não", value: "Não" },
                          ]}
                          value={field.value}
                          onChange={field.onChange}
                          error={errors.wantsGuests?.message}
                        />
                      )}
                    />
                  </div>
                </motion.div>
              ) : null}
              {doesNotWantToAttend ? (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <Alert>Registro recebido como não presencial. A organização utilizará os canais informados se houver atualizações sobre acompanhamento do evento.</Alert>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </FormSection>

        <AnimatePresence>
          {wantsToAttend && wantsGuests ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <FormSection eyebrow="Convidados" title="Convidados" description="Liste as pessoas que você gostaria de levar ao evento final.">
                <div className="space-y-5">
                  <Field id="guestQuantity" label="Quantidade de convidados" required error={errors.guestQuantity?.message}>
                    <TextInput
                      id="guestQuantity"
                      type="number"
                      min={1}
                      max={10}
                      placeholder="Ex: 2"
                      inputMode="numeric"
                      hasError={!!errors.guestQuantity}
                      {...register("guestQuantity", { valueAsNumber: true })}
                    />
                  </Field>
                  <Alert tone="warning">A solicitação de convidados não garante presença. A confirmação depende da disponibilidade de vagas.</Alert>
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-md border border-hub-border bg-[#FAFAFA] p-4">
                      <h3 className="mb-4 text-sm font-semibold text-hub-text">Convidado {index + 1}</h3>
                      <div className="grid gap-5 sm:grid-cols-3">
                        <Field id={`guests.${index}.fullName`} label="Nome completo" required error={errors.guests?.[index]?.fullName?.message}>
                          <TextInput id={`guests.${index}.fullName`} placeholder="Nome do convidado" hasError={!!errors.guests?.[index]?.fullName} {...register(`guests.${index}.fullName`)} />
                        </Field>
                        <Controller
                          control={control}
                          name={`guests.${index}.cpf`}
                          render={({ field }) => (
                            <Field id={`guests.${index}.cpf`} label="CPF" error={errors.guests?.[index]?.cpf?.message}>
                              <TextInput id={`guests.${index}.cpf`} inputMode="numeric" placeholder="000.000.000-00" value={field.value} onBlur={field.onBlur} onChange={(event) => field.onChange(maskCpf(event.target.value))} hasError={!!errors.guests?.[index]?.cpf} />
                            </Field>
                          )}
                        />
                        <Controller
                          control={control}
                          name={`guests.${index}.whatsapp`}
                          render={({ field }) => (
                            <Field id={`guests.${index}.whatsapp`} label="WhatsApp" error={errors.guests?.[index]?.whatsapp?.message}>
                              <TextInput id={`guests.${index}.whatsapp`} inputMode="tel" placeholder="(00) 00000-0000" value={field.value} onBlur={field.onBlur} onChange={(event) => field.onChange(maskPhone(event.target.value))} hasError={!!errors.guests?.[index]?.whatsapp} />
                            </Field>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </FormSection>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <FormSection eyebrow="Motivação" title="Motivação" description="Compartilhe brevemente o que motiva sua presença no evento.">
          <Field id="reason" label="Por que você gostaria de participar presencialmente?" hint="Essa resposta pode ajudar na priorização das vagas disponíveis." error={errors.reason?.message}>
            <Textarea id="reason" placeholder="Conte sua motivação em poucas linhas" hasError={!!errors.reason} {...register("reason")} />
          </Field>
        </FormSection>

        <FormSection eyebrow="Revisão" title="Revisão" description="Confira os principais pontos antes de enviar.">
          <ReviewCard items={reviewItems} />
        </FormSection>

        <FormSection eyebrow="Confirmação" title="Confirmação" description="O envio registra seu interesse para análise da organização.">
          <div className="space-y-4">
            {submitError ? <Alert tone="error">{submitError}</Alert> : null}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-hub-muted">A confirmação, se houver vaga disponível, será enviada pelos canais informados.</p>
              <PrimaryButton type="submit" loading={loading}>
                Enviar interesse
              </PrimaryButton>
            </div>
          </div>
        </FormSection>
      </form>
    </FormShell>
  );
}
