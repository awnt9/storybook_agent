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

async function draftFormRequest(path, formData, { method = "POST" } = {}) {
  const accessToken = localStorage.getItem("access_token");
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg).join(", ")
          : "No se pudo completar la operación del borrador",
    );
  }

  return response.json();
}

export async function createDraft(apiRequest) {
  const payload = await apiRequest("/api/v1/drafts", { method: "POST" });
  storeDraftId(payload.draft_id);
  return payload.draft_id;
}

export async function loadDraft(apiRequest, draftId) {
  return apiRequest(`/api/v1/drafts/${draftId}`);
}

export async function updateDraftSetup(draftId, { title, imageFile } = {}) {
  const formData = new FormData();
  if (title != null) formData.append("title", title);
  if (imageFile) formData.append("image", imageFile);

  return draftFormRequest(`/api/v1/drafts/${draftId}`, formData, { method: "PATCH" });
}

export async function updateDraftInteraction(draftId, componentId, { text, imageFile } = {}) {
  const formData = new FormData();
  if (text != null) formData.append("text", text);
  if (imageFile) formData.append("image", imageFile);

  return draftFormRequest(
    `/api/v1/drafts/${draftId}/interactions/${componentId}`,
    formData,
    { method: "PATCH" },
  );
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
