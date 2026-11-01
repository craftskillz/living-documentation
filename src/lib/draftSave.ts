export const AUTOSAVE_INTERVAL_MS = 10_000;

/** Return canonical persisted content when the server normalizes Markdown/frontmatter. */
export type SaveDocument = (content: string, expectedContent?: string) => Promise<string | undefined>;

/** One editing session: manual and automatic saves share the same lock and saved snapshot. */
export function createDraftSaver(options: {
  initialDraft: string;
  initialContent: string;
  persist: SaveDocument;
  serialize?: (draft: string) => string;
  onSavingChange: (saving: boolean) => void;
}) {
  let lastSavedDraft = options.initialDraft;
  let expectedContent = options.initialContent;
  let saving = false;
  return {
    isDirty: (draft: string) => draft !== lastSavedDraft,
    async save(draft: string): Promise<"saved" | "unchanged" | "busy"> {
      if (saving) return "busy";
      if (draft === lastSavedDraft) return "unchanged";
      saving = true;
      options.onSavingChange(true);
      try {
        const submitted = options.serialize ? options.serialize(draft) : draft;
        const persisted = await options.persist(submitted, expectedContent);
        expectedContent = typeof persisted === "string" ? persisted : submitted;
        // Do not mark edits typed during the request as saved.
        lastSavedDraft = draft;
        return "saved";
      } finally {
        saving = false;
        options.onSavingChange(false);
      }
    },
  };
}
