const STORAGE_KEY = "hubChallengeSubmissions";

export type StoredSubmission = {
  id: string;
  submittedAt: string;
  synced: boolean;
  syncError?: string;
  payload: Record<string, unknown>;
};

function createId() {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `submission-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getStoredSubmissions(): StoredSubmission[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredSubmissions(submissions: StoredSubmission[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
  window.dispatchEvent(new Event("hub-submissions-updated"));
}

export function getSubmissionsEndpoint() {
  return import.meta.env.VITE_SUBMISSIONS_ENDPOINT || "";
}

export async function saveSubmission(payload: Record<string, unknown>) {
  const record: StoredSubmission = {
    id: createId(),
    submittedAt: new Date().toISOString(),
    synced: false,
    payload,
  };

  saveStoredSubmissions([record, ...getStoredSubmissions()]);

  const endpoint = getSubmissionsEndpoint();
  if (!endpoint) {
    return record;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const remoteRecord = await response.json();
    const updatedRecord = { ...record, ...remoteRecord, synced: true, syncError: undefined };
    saveStoredSubmissions(getStoredSubmissions().map((item) => (item.id === record.id ? updatedRecord : item)));
    return updatedRecord;
  } catch (error) {
    const updatedRecord = {
      ...record,
      syncError: error instanceof Error ? error.message : "Erro ao sincronizar",
    };
    saveStoredSubmissions(getStoredSubmissions().map((item) => (item.id === record.id ? updatedRecord : item)));
    return updatedRecord;
  }
}

export function clearStoredSubmissions() {
  saveStoredSubmissions([]);
}
