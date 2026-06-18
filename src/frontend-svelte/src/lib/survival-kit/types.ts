// Survival Kit — shared types for the independent dashboard module.

export type Priority = "normal" | "urgent" | "later";

export interface SkTask {
  id: number;
  text: string;
  priority: Priority;
  done: boolean;
}

export type SkBloc =
  | { type: "b" | "p" | "pre"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export type BlocType = "b" | "p" | "pre" | "ul" | "table";

export interface SkNote {
  id: number;
  theme: string;
  titre: string;
  blocs: SkBloc[];
}

export interface SkLink {
  nom: string;
  desc: string;
  url: string;
}

export interface SkCategory {
  theme: string;
  titre: string;
  liens: SkLink[];
}

export interface SkState {
  tasks: SkTask[];
  notes: SkNote[];
  links: SkCategory[];
}

/** The six named theme colours carried over from the original kit. */
export const SK_THEMES = [
  "t-green",
  "t-violet",
  "t-amber",
  "t-sky",
  "t-rose",
  "t-teal",
] as const;

export type SkTheme = (typeof SK_THEMES)[number];
