import { test } from "node:test";
import assert from "node:assert/strict";
import { createDraftSaver } from "../../src/lib/draftSave";

test("unchanged drafts do not write; subsequent saves use canonical persisted content", async () => {
  const calls: (string | undefined)[][] = [];
  const saver = createDraftSaver({ initialDraft: "start", initialContent: "start", onSavingChange: () => {},
    persist: async (content, expected) => { calls.push([content, expected]); return `canonical:${content}`; } });
  assert.equal(await saver.save("start"), "unchanged");
  assert.equal(await saver.save("first"), "saved");
  assert.equal(await saver.save("first"), "unchanged");
  assert.equal(await saver.save("second"), "saved");
  assert.deepEqual(calls, [["first", "start"], ["second", "canonical:first"]]);
});

test("manual and timer requests share a lock without marking newer edits as saved", async () => {
  let release: (value: string) => void = () => {};
  const pending = new Promise<string>(resolve => { release = resolve; });
  const states: boolean[] = [];
  let writes = 0;
  const saver = createDraftSaver({ initialDraft: "start", initialContent: "start", onSavingChange: value => states.push(value),
    persist: async () => { writes++; return pending; } });
  const first = saver.save("snapshot");
  assert.equal(await saver.save("newer edit"), "busy");
  assert.equal(writes, 1);
  assert.deepEqual(states, [true]);
  release("snapshot");
  await first;
  assert.equal(saver.isDirty("snapshot"), false);
  assert.equal(saver.isDirty("newer edit"), true);
  assert.deepEqual(states, [true, false]);
});

test("failure releases the lock and keeps the baseline for a later retry", async () => {
  let fail = true;
  let expected: string | undefined;
  const states: boolean[] = [];
  const saver = createDraftSaver({ initialDraft: "start", initialContent: "start", onSavingChange: value => states.push(value),
    persist: async (_, baseline) => { expected = baseline; if (fail) throw new Error("offline"); return undefined; } });
  await assert.rejects(saver.save("draft"), /offline/);
  assert.equal(saver.isDirty("draft"), true);
  assert.deepEqual(states, [true, false]);
  fail = false;
  assert.equal(await saver.save("draft"), "saved");
  assert.equal(expected, "start");
});

test("section drafts compose into the whole document on each save", async () => {
  const calls: (string | undefined)[][] = [];
  const saver = createDraftSaver({ initialDraft: "old", initialContent: "before old after", onSavingChange: () => {},
    serialize: text => `before ${text} after`,
    persist: async (content, expected) => { calls.push([content, expected]); return content; } });
  await saver.save("longer section");
  await saver.save("short");
  assert.deepEqual(calls, [["before longer section after", "before old after"], ["before short after", "before longer section after"]]);
});
