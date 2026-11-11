import { supabase } from "@/integrations/supabase/client";

export const DOCUMENT_BUCKET = "lead-documents";

export type DocumentKind = "quote" | "contract";

const MAX_SIZE = 20 * 1024 * 1024;
const MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/**
 * The lead ids that have a folder in the bucket — that is, the only leads that
 * can possibly have paperwork.
 *
 * Without this, the library screen asks the storage API for two folders per
 * lead (quotes and contracts) whether or not that lead has ever had a file:
 * 368 requests to discover that 24 leads have documents and 160 do not. One
 * listing of the bucket root answers that question first, so the per-lead
 * calls are only made where there is something to find.
 */
export async function listLeadsWithDocuments() {
  const ids: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .list("", { limit: 100, offset });
    if (error) throw error;
    // A folder comes back with no id; a stray file at the root would have one.
    ids.push(...data.filter((row) => !row.id).map((row) => row.name));
    if (data.length < 100) return ids;
  }
}

export async function listLeadDocuments(id: string) {
  const groups = await Promise.all(
    (["quote", "contract"] as const).map(async (category) => {
      const rows = [];
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await supabase.storage
          .from(DOCUMENT_BUCKET)
          .list(`${id}/${category}`, {
            limit: 100,
            offset,
            sortBy: { column: "created_at", order: "desc" },
          });
        if (error) throw error;
        rows.push(
          ...data
            .filter((row) => row.id)
            .map((row) => ({ ...row, category, path: `${id}/${category}/${row.name}` })),
        );
        if (data.length < 100) return rows;
      }
    }),
  );
  return groups.flat().sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

/** The uuid prefix keeps two files with the same name apart; nobody needs to read it. */
export function documentTitle(name: string) {
  return name.replace(/^[0-9a-f-]{36}__/, "");
}

/** "412 kB", the way the canvas writes a file size. */
export function documentSize(bytes: number | null | undefined) {
  const value = Number(bytes ?? 0);
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} kB`;
  return `${(value / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export async function uploadLeadDocument(id: string, category: DocumentKind, selected: File) {
  const extension = selected.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[extension];
  if (!contentType || selected.size > MAX_SIZE || selected.size === 0)
    throw new Error("invalid_file");
  const safeName = selected.name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} ._()-]/gu, "_")
    .slice(-180);
  const path = `${id}/${category}/${crypto.randomUUID()}__${safeName}`;
  const { error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, selected, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

/**
 * Open a document in a new tab. The popup is opened first, synchronously, so
 * the browser attributes it to the click rather than to the signed-url call.
 */
export async function openLeadDocument(path: string) {
  const popup = window.open("about:blank", "_blank");
  if (popup) popup.opener = null;
  try {
    const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(path, 60);
    if (error) throw error;
    if (!popup) return { ok: false as const, reason: "popup_blocked" as const };
    popup.location.replace(data.signedUrl);
    return { ok: true as const };
  } catch {
    popup?.close();
    return { ok: false as const, reason: "failed" as const };
  }
}
