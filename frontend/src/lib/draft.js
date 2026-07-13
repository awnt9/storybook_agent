const DRAFT_STORAGE_KEY = "storybook_draft_id";

export function getStoredDraftId() {
  return sessionStorage.getItem(DRAFT_STORAGE_KEY);
}

export function storeDraftId(draftId) {
  sessionStorage.setItem(DRAFT_STORAGE_KEY, draftId);
}

export function clearStoredDraftId() {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

export async function createDraft(apiRequest) {
  const payload = await apiRequest("/api/v1/drafts", { method: "POST" });
  storeDraftId(payload.draft_id);
  return payload.draft_id;
}

export async function loadDraft(apiRequest, draftId) {
  return apiRequest(`/api/v1/drafts/${draftId}`);
}

export async function commitDraft(apiRequest, draftId, { title } = {}) {
  return apiRequest(`/api/v1/drafts/${draftId}/commit`, {
    method: "POST",
    body: JSON.stringify({ title: title ?? null }),
  });
}

export async function discardDraft(apiRequest, draftId) {
  await apiRequest(`/api/v1/drafts/${draftId}`, { method: "DELETE" });
  clearStoredDraftId();
}

export async function ensureDraftSession(apiRequest) {
  const storedDraftId = getStoredDraftId();

  if (storedDraftId) {
    try {
      await loadDraft(apiRequest, storedDraftId);
      return storedDraftId;
    } catch {
      clearStoredDraftId();
    }
  }

  return createDraft(apiRequest);
}
