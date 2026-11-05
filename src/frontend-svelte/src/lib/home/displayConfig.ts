import { home } from "./state.svelte";

const DEFAULT_CODE_BLOCK_MAX_HEIGHT = 400;

/** Settings that shape rendered Markdown, shared by the screens that show it. */
export function applyMarkdownDisplayConfig(config: Record<string, unknown>): void {
  home.codeBlockMaxHeight = typeof config.codeBlockMaxHeight === "number" ? config.codeBlockMaxHeight : DEFAULT_CODE_BLOCK_MAX_HEIGHT;
  home.imageRoundedCorners = !!config.imageRoundedCorners;
  home.imageCentered = !!config.imageCentered;
  home.imageBorder = !!config.imageBorder;
  home.codeBlockLightTheme = !!config.codeBlockLightTheme;
  if (home.codeBlockMaxHeight > 0) {
    document.documentElement.style.setProperty("--ld-code-max-h", `${home.codeBlockMaxHeight}px`);
  }
}
