import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Alert } from "../components/Alert";
import { Field, TextInput } from "../components/Field";
import { FormSection } from "../components/FormSection";
import { FormShell } from "../components/FormShell";
import { PrimaryButton } from "../components/PrimaryButton";
import { RadioGroupField } from "../components/RadioGroupField";
import { ReviewCard } from "../components/ReviewCard";
import { SuccessState } from "../components/SuccessState";
import { saveSubmission } from "../services/submissions";
import { isCompleteCpf, isCompletePhone, maskCpf, maskPhone } from "../utils/masks";

const finalistSchema = z
  .object({
    teamNumber: z.string().optional(),
    fullName: z.string().trim().min(3, "Informe seu nome completo."),
    whatsapp: z.string().refine(isCompletePhone, "Informe um WhatsApp válido no formato (00) 00000-0000."),
    email: z.string().trim().email("Informe um e-mail válido."),
    teamHasPitchPresenter: z.string().min(1, "Selecione uma opção."),
    pitchPresenter: z.object({
      fullName: z.string().optional(),
      cpf: z.string().optional(),
      isCurrentUser: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().optional(),
    }),
    willAttendInPerson: z.string().min(1, "Selecione uma opção."),
    cpf: z.string().optional(),
    wantsGuest: z.string().min(1, "Selecione uma opção."),
    guest: z.object({
      fullName: z.string().optional(),
      cpf: z.string().optional(),
    }),
    wantsExtraGuests: z.string().optional(),
    extraGuests: z.array(
      z.object({
        fullName: z.string().trim().min(3, "Informe o nome completo do convidado."),
        cpf: z.string().optional(),
        whatsapp: z.string().optional(),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.willAttendInPerson === "Sim" && !isCompleteCpf(data.cpf)) {
      ctx.addIssue({ code: "custom", path: ["cpf"], message: "Informe seu CPF para acesso presencial." });
    }

    if (data.wantsGuest === "Sim") {
      if (!data.guest.fullName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["guest", "fullName"], message: "Informe o nome completo do convidado." });
      }
      if (data.guest.cpf && !isCompleteCpf(data.guest.cpf)) {
        ctx.addIssue({ code: "custom", path: ["guest", "cpf"], message: "Confira o CPF informado." });
      }
    }

    if (data.wantsExtraGuests === "Sim" && data.extraGuests.length === 0) {
      ctx.addIssue({ code: "custom", path: ["extraGuests"], message: "Adicione pelo menos um convidado extra ou selecione Não." });
    }

    data.extraGuests.forEach((guest, index) => {
      if (guest.cpf && !isCompleteCpf(guest.cpf)) {
        ctx.addIssue({ code: "custom", path: ["extraGuests", index, "cpf"], message: "Confira o CPF informado." });
      }
      if (guest.whatsapp && !isCompletePhone(guest.whatsapp)) {
        ctx.addIssue({ code: "custom", path: ["extraGuests", index, "whatsapp"], message: "Confira o WhatsApp informado." });
      }
    });
  });

type FinalistFormValues = z.infer<typeof finalistSchema>;

const defaultValues: FinalistFormValues = {
  teamNumber: "",
  fullName: "",
  whatsapp: "",
  email: "",
  teamHasPitchPresenter: "",
  pitchPresenter: {
    fullName: "",
    cpf: "",
    isCurrentUser: "",
    whatsapp: "",
    email: "",
  },
  willAttendInPerson: "",
  cpf: "",
  wantsGuest: "",
  guest: {
    fullName: "",
    cpf: "",
  },
  wantsExtraGuests: "Não",
  extraGuests: [],
};

export function FinalistConfirmationPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FinalistFormValues>({
    resolver: zodResolver(finalistSchema),
    defaultValues,
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "extraGuests" });
  const [teamNumber, fullName, teamHasPitchPresenter, willAttendInPerson, wantsGuestAnswer, wantsExtraGuestsAnswer] = watch([
    "teamNumber",
    "fullName",
    "teamHasPitchPresenter",
    "willAttendInPerson",
    "wantsGuest",
    "wantsExtraGuests",
  ]);
  const attendsInPerson = willAttendInPerson === "Sim";
  const doesNotAttendInPerson = willAttendInPerson === "Não";
  const wantsGuest = wantsGuestAnswer === "Sim";
  const wantsExtraGuests = wantsExtraGuestsAnswer === "Sim";

  const reviewItems = useMemo(
    () => [
      { label: "Participante", value: fullName },
      { label: "Time", value: teamNumber },
      { label: "Apresentará o pitch", value: teamHasPitchPresenter },
      { label: "Presença no evento", value: willAttendInPerson },
      { label: "Convidado garantido", value: wantsGuestAnswer },
      { label: "Extras cadastrados", value: wantsExtraGuests ? fields.length : 0 },
    ],
    [fields.length, fullName, teamHasPitchPresenter, teamNumber, wantsGuestAnswer, willAttendInPerson, wantsExtraGuests],
  );

  async function onSubmit(data: FinalistFormValues) {
    setLoading(true);
    const payload = {
      formType: "finalist_confirmation",
      teamNumber: data.teamNumber || "",
      fullName: data.fullName,
      whatsapp: data.whatsapp,
      email: data.email,
      teamHasPitchPresenter: data.teamHasPitchPresenter,
      pitchPresenter: { fullName: "", cpf: "", isCurrentUser: true, whatsapp: "", email: "" },
      willAttendInPerson: data.willAttendInPerson === "Sim",
      cpf: data.willAttendInPerson === "Sim" ? data.cpf || "" : "",
      guest: data.wantsGuest === "Sim" ? data.guest : { fullName: "", cpf: "" },
      extraGuests: data.wantsExtraGuests === "Sim" ? data.extraGuests : [],
      status: "confirmed",
    };

    await saveSubmission(payload);
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <SuccessState
        title="Sua confirmação foi registrada com sucesso."
        message={"Em breve enviaremos novas informações sobre o evento e acesso presencial."}
      />
    );
  }

  return (
    <FormShell
      title="Confirmação de Presença"
      subtitle="Evento final do HUB Innovation Challenge"
      description={[
        "Este formulário é individual e tem como objetivo confirmar a participação dos finalistas no evento final do HUB Innovation Challenge.",
        "Cada participante presencial poderá garantir a presença de até 1 convidado.",
        "Caso deseje adicionar convidados extras, eles poderão ser cadastrados, porém estarão sujeitos à disponibilidade de vagas e validação da organização.",
        "O link de transmissão será enviado posteriormente para quem acompanhar online.",
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <FormSection eyebrow="Dados pessoais" title="Dados pessoais" description="Informe seus dados para comunicação e credenciamento.">
          <div className="grid gap-5 sm:grid-cols-2">
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
              name="whatsapp"
              render={({ field }) => (
                <Field id="whatsapp" label="WhatsApp" required hint="Utilizaremos este número para envio de informações." error={errors.whatsapp?.message}>
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

        <FormSection eyebrow="Informações do time" title="Informações do time" description="Confirme se você será a pessoa responsável pela apresentação presencial do pitch.">
          <Controller
            control={control}
            name="teamHasPitchPresenter"
            render={({ field }) => (
              <RadioGroupField
                id="teamHasPitchPresenter"
                label="Você será a pessoa responsável por apresentar o pitch presencialmente?"
                required
                hint="Use esta resposta para indicar se a apresentação presencial ficará sob sua responsabilidade."
                options={[
                  { label: "Sim", value: "Sim" },
                  { label: "Não", value: "Não" },
                  { label: "Ainda estamos definindo", value: "Ainda estamos definindo" },
                ]}
                value={field.value}
                onChange={field.onChange}
                error={errors.teamHasPitchPresenter?.message}
              />
            )}
          />
        </FormSection>

        <FormSection eyebrow="Participação presencial" title="Participação presencial" description="Confirme se você estará presencialmente no evento final.">
          <div className="space-y-5">
            <Controller
              control={control}
              name="willAttendInPerson"
              render={({ field }) => (
                <RadioGroupField
                  id="willAttendInPerson"
                  label="Você participará presencialmente do evento?"
                  required
                  options={[
                    { label: "Sim", value: "Sim" },
                    { label: "Não", value: "Não" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.willAttendInPerson?.message}
                />
              )}
            />
            <AnimatePresence>
              {attendsInPerson ? (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-md">
                  <Controller
                    control={control}
                    name="cpf"
                    render={({ field }) => (
                      <Field id="cpf" label="CPF" required hint="Necessário para acesso presencial ao evento." error={errors.cpf?.message}>
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
                </motion.div>
              ) : null}
              {doesNotAttendInPerson ? (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <Alert>O link de transmissão/acompanhamento será enviado posteriormente via WhatsApp informado acima.</Alert>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </FormSection>

        <FormSection eyebrow="Convidados" title="Convidados" description="Cadastre o convidado garantido e, se necessário, solicite convidados extras.">
          <div className="space-y-6">
            <Controller
              control={control}
              name="wantsGuest"
              render={({ field }) => (
                <RadioGroupField
                  id="wantsGuest"
                  label="Deseja cadastrar convidado?"
                  required
                  hint="Cada participante presencial pode garantir apenas 1 convidado."
                  options={[
                    { label: "Sim", value: "Sim" },
                    { label: "Não", value: "Não" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.wantsGuest?.message}
                />
              )}
            />
            <AnimatePresence>
              {wantsGuest ? (
                <motion.div className="grid gap-5 rounded-md border border-hub-border bg-[#FAFAFA] p-4 sm:grid-cols-2" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <Field id="guest.fullName" label="Nome completo do convidado 1" required hint="Este convidado possui presença garantida." error={errors.guest?.fullName?.message}>
                    <TextInput id="guest.fullName" placeholder="Digite o nome completo" hasError={!!errors.guest?.fullName} {...register("guest.fullName")} />
                  </Field>
                  <Controller
                    control={control}
                    name="guest.cpf"
                    render={({ field }) => (
                      <Field id="guest.cpf" label="CPF do convidado 1" error={errors.guest?.cpf?.message}>
                        <TextInput
                          id="guest.cpf"
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={(event) => field.onChange(maskCpf(event.target.value))}
                          hasError={!!errors.guest?.cpf}
                        />
                      </Field>
                    )}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <Controller
              control={control}
              name="wantsExtraGuests"
              render={({ field }) => (
                <RadioGroupField
                  id="wantsExtraGuests"
                  label="Deseja adicionar convidados extras?"
                  hint="Convidados extras não possuem presença garantida."
                  options={[
                    { label: "Sim", value: "Sim" },
                    { label: "Não", value: "Não" },
                  ]}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value === "Sim" && fields.length === 0) {
                      append({ fullName: "", cpf: "", whatsapp: "" });
                    }
                  }}
                  error={typeof errors.extraGuests?.message === "string" ? errors.extraGuests.message : undefined}
                />
              )}
            />
            <AnimatePresence>
              {wantsExtraGuests ? (
                <motion.div className="space-y-4" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <Alert tone="warning">Apenas o primeiro convidado possui presença garantida. Os demais convidados dependerão da disponibilidade de vagas.</Alert>
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-md border border-hub-border bg-[#FAFAFA] p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-hub-text">Convidado extra {index + 1}</h3>
                        <button type="button" onClick={() => remove(index)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hub-border bg-white text-hub-muted transition hover:text-hub-error" aria-label={`Remover convidado extra ${index + 1}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-3">
                        <Field id={`extraGuests.${index}.fullName`} label="Nome completo" required error={errors.extraGuests?.[index]?.fullName?.message}>
                          <TextInput id={`extraGuests.${index}.fullName`} placeholder="Nome do convidado" hasError={!!errors.extraGuests?.[index]?.fullName} {...register(`extraGuests.${index}.fullName`)} />
                        </Field>
                        <Controller
                          control={control}
                          name={`extraGuests.${index}.cpf`}
                          render={({ field }) => (
                            <Field id={`extraGuests.${index}.cpf`} label="CPF" error={errors.extraGuests?.[index]?.cpf?.message}>
                              <TextInput id={`extraGuests.${index}.cpf`} inputMode="numeric" placeholder="000.000.000-00" value={field.value} onBlur={field.onBlur} onChange={(event) => field.onChange(maskCpf(event.target.value))} hasError={!!errors.extraGuests?.[index]?.cpf} />
                            </Field>
                          )}
                        />
                        <Controller
                          control={control}
                          name={`extraGuests.${index}.whatsapp`}
                          render={({ field }) => (
                            <Field id={`extraGuests.${index}.whatsapp`} label="WhatsApp" error={errors.extraGuests?.[index]?.whatsapp?.message}>
                              <TextInput id={`extraGuests.${index}.whatsapp`} inputMode="tel" placeholder="(00) 00000-0000" value={field.value} onBlur={field.onBlur} onChange={(event) => field.onChange(maskPhone(event.target.value))} hasError={!!errors.extraGuests?.[index]?.whatsapp} />
                            </Field>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => append({ fullName: "", cpf: "", whatsapp: "" })} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-hub-border bg-white px-4 text-sm font-medium text-hub-text transition hover:border-[#D6D6D6] hover:bg-[#FAFAFA]">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Adicionar convidado extra
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </FormSection>

        <FormSection eyebrow="Revisão" title="Revisão" description="Confira os principais pontos antes de confirmar.">
          <ReviewCard items={reviewItems} />
        </FormSection>

        <FormSection eyebrow="Confirmação" title="Confirmação" description="Ao enviar, sua participação será registrada para validação da organização.">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-hub-muted">Você poderá receber atualizações pelo WhatsApp e e-mail informados neste formulário.</p>
            <PrimaryButton type="submit" loading={loading}>
              Confirmar participação
            </PrimaryButton>
          </div>
        </FormSection>
      </form>
    </FormShell>
  );
}
