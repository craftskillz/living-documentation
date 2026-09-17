import { clearScreenDown, cursorTo, emitKeypressEvents, moveCursor, type Key } from "node:readline";
import { OPTIONAL_HEADER_MENUS } from "../../shared/headerNavigation";
import en from "./init.en.json";
import fr from "./init.fr.json";

/** Returns hidden routes. Non-interactive installs keep every optional menu hidden. */
export async function promptHiddenHeaderMenus(language: "en" | "fr"): Promise<string[]> {
  const menus = OPTIONAL_HEADER_MENUS;
  if (!process.stdin.isTTY || !process.stdout.isTTY) return menus.map((menu) => menu.href);

  const messages = language === "fr" ? fr : en;
  const selected = new Set<string>();
  let cursor = 0;
  let rendered = false;
  const wasRaw = process.stdin.isRaw;
  const wasPaused = process.stdin.isPaused();
  const render = () => {
    if (rendered) {
      moveCursor(process.stdout, 0, -menus.length);
      cursorTo(process.stdout, 0);
      clearScreenDown(process.stdout);
    }
    for (const [index, menu] of menus.entries()) {
      process.stdout.write(`${index === cursor ? ">" : " "} [${selected.has(menu.href) ? "x" : " "}] ${messages.labels[menu.href]}\n`);
    }
    rendered = true;
  };

  process.stdout.write(`\n${messages.title}\n${messages.help}\n`);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        process.stdin.off("keypress", onKey);
        process.stdin.off("end", onEnd);
      };
      const onEnd = () => {
        cleanup();
        reject(new Error(messages.cancelled));
      };
      const onKey = (_text: string, key: Key) => {
        if ((key.ctrl && key.name === "c") || key.name === "escape") {
          onEnd();
          return;
        }
        if (key.name === "return") {
          cleanup();
          resolve();
          return;
        }
        if (key.name === "up") cursor = (cursor + menus.length - 1) % menus.length;
        else if (key.name === "down") cursor = (cursor + 1) % menus.length;
        else if (key.name === "space") {
          const href = menus[cursor].href;
          if (selected.has(href)) selected.delete(href);
          else selected.add(href);
        } else return;
        render();
      };
      process.stdin.on("keypress", onKey);
      process.stdin.once("end", onEnd);
      render();
    });
  } finally {
    process.stdin.setRawMode(wasRaw);
    if (wasPaused) process.stdin.pause();
    process.stdout.write("\n");
  }
  return menus.filter((menu) => !selected.has(menu.href)).map((menu) => menu.href);
}
