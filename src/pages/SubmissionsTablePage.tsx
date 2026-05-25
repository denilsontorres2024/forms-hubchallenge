import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Database, Download, Trash2, WifiOff } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { clearSubmissions, getStoredSubmissions, isRemoteSubmissionsEnabled, loadSubmissions, type StoredSubmission } from "../services/submissions";

const columns = [
  "Data",
  "Tipo",
  "Nome",
  "Time",
  "WhatsApp",
  "E-mail",
  "Status",
  "Sincronização",
];

function value(payload: Record<string, unknown>, key: string) {
  const raw = payload[key];
  return typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? String(raw) : "";
}

function formTypeLabel(type: string) {
  if (type === "finalist_confirmation") return "Finalista";
  if (type === "interest_request") return "Interessado";
  return type || "Não informado";
}

function toCsvValue(input: string) {
  return `"${input.replace(/"/g, '""')}"`;
}

function downloadCsv(submissions: StoredSubmission[]) {
  const rows = [
    columns,
    ...submissions.map((submission) => [
      new Date(submission.submittedAt).toLocaleString("pt-BR"),
      formTypeLabel(value(submission.payload, "formType")),
      value(submission.payload, "fullName"),
      value(submission.payload, "teamNumber"),
      value(submission.payload, "whatsapp"),
      value(submission.payload, "email"),
      value(submission.payload, "status"),
      submission.synced ? "Sincronizado" : submission.syncError ? `Erro: ${submission.syncError}` : "Local",
    ]),
  ];

  const csv = rows.map((row) => row.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hub-challenge-submissoes.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function SubmissionsTablePage() {
  const [submissions, setSubmissions] = useState<StoredSubmission[]>(() => getStoredSubmissions());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasEndpoint = isRemoteSubmissionsEnabled();

  useEffect(() => {
    const refresh = async () => {
      setLoading(true);
      setError("");

      try {
        setSubmissions(await loadSubmissions());
      } catch (currentError) {
        setError(currentError instanceof Error ? currentError.message : "Erro ao carregar submissões.");
        setSubmissions(getStoredSubmissions());
      } finally {
        setLoading(false);
      }
    };

    void refresh();
    window.addEventListener("hub-submissions-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("hub-submissions-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const totalByType = useMemo(
    () =>
      submissions.reduce(
        (acc, submission) => {
          const type = value(submission.payload, "formType");
          if (type === "finalist_confirmation") acc.finalists += 1;
          if (type === "interest_request") acc.interest += 1;
          return acc;
        },
        { finalists: 0, interest: 0 },
      ),
    [submissions],
  );

  return (
    <main className="min-h-screen bg-hub-background px-4 py-6 text-hub-text sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 rounded-lg border border-hub-border bg-white p-5 shadow-panel sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <BrandMark />
              <div className="mt-8">
                <p className="mb-3 text-sm font-medium text-hub-muted">Tabela local de respostas</p>
                <h1 className="text-3xl font-semibold tracking-[0] text-hub-text">Submissões dos Formulários</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-hub-muted">
                  Esta tabela mostra os envios salvos neste navegador. Para produção, configure um endpoint externo para sincronizar com uma planilha online.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => downloadCsv(submissions)}
                disabled={submissions.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-hub-border bg-white px-4 text-sm font-medium text-hub-text transition hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:text-hub-placeholder"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Baixar CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSubmissions()
                    .then(() => setSubmissions([]))
                    .catch((currentError) => setError(currentError instanceof Error ? currentError.message : "Erro ao limpar submissões."));
                }}
                disabled={submissions.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-hub-border bg-white px-4 text-sm font-medium text-hub-muted transition hover:text-hub-error disabled:cursor-not-allowed disabled:text-hub-placeholder"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Limpar
              </button>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-hub-border bg-white p-5 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hub-muted">Total</p>
            <p className="mt-2 text-3xl font-semibold text-hub-text">{submissions.length}</p>
          </div>
          <div className="rounded-lg border border-hub-border bg-white p-5 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hub-muted">Finalistas</p>
            <p className="mt-2 text-3xl font-semibold text-hub-text">{totalByType.finalists}</p>
          </div>
          <div className="rounded-lg border border-hub-border bg-white p-5 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hub-muted">Interessados</p>
            <p className="mt-2 text-3xl font-semibold text-hub-text">{totalByType.interest}</p>
          </div>
          <div className="rounded-lg border border-hub-border bg-white p-5 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hub-muted">Destino</p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-hub-text">
              {hasEndpoint ? <CheckCircle2 className="h-4 w-4 text-hub-success" /> : <WifiOff className="h-4 w-4 text-hub-warning" />}
              {hasEndpoint ? "Banco ativo" : "Somente local"}
            </p>
          </div>
        </section>

        {error ? (
          <div className="mb-6 rounded-lg border border-[#F8DCA4] bg-[#FFF8E9] p-4 text-sm font-medium text-[#7A4B02]">
            Não foi possível carregar o banco agora. Mostrando dados locais. Detalhe: {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-hub-border bg-white shadow-panel">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[#FAFAFA]">
                <tr>
                  {columns.map((column) => (
                    <th key={column} scope="col" className="border-b border-hub-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-hub-muted">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-hub-muted">
                      Carregando submissões...
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FAFAFA] text-hub-muted">
                        <Database className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <p className="mt-3 font-medium text-hub-text">Nenhuma submissão registrada ainda.</p>
                      <p className="mt-1 text-hub-muted">Quando alguém enviar um formulário neste navegador, a resposta aparecerá aqui.</p>
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-hub-border last:border-b-0">
                      <td className="whitespace-nowrap px-4 py-4 text-hub-muted">{new Date(submission.submittedAt).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-4 font-medium text-hub-text">{formTypeLabel(value(submission.payload, "formType"))}</td>
                      <td className="px-4 py-4 text-hub-text">{value(submission.payload, "fullName") || "Não informado"}</td>
                      <td className="px-4 py-4 text-hub-text">{value(submission.payload, "teamNumber") || "Não informado"}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-hub-muted">{value(submission.payload, "whatsapp") || "Não informado"}</td>
                      <td className="px-4 py-4 text-hub-muted">{value(submission.payload, "email") || "Não informado"}</td>
                      <td className="px-4 py-4 text-hub-muted">{value(submission.payload, "status") || "Não informado"}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            submission.synced
                              ? "bg-[#ECFDF3] text-hub-success"
                              : submission.syncError
                                ? "bg-[#FEF2F2] text-hub-error"
                                : "bg-[#FFF8E6] text-[#8A5B00]"
                          }`}
                        >
                          {submission.synced ? "Sincronizado" : submission.syncError ? "Erro" : "Local"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
