import fs from "fs";
import path from "path";
import { test, expect } from "../helpers/ld-fixture";

test("PUT /api/config rejects an absolute sourceRoot", async ({
  request,
  ld,
}) => {
  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { sourceRoot: "/abs/path" },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/relative path/i);
});

test("PUT /api/config rejects an absolute entry in extraFiles", async ({
  request,
  ld,
}) => {
  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { extraFiles: ["/abs/foo.md"] },
  });
  expect(res.status()).toBe(400);
});

test("PUT /api/config accepts relative paths and persists them as stored form", async ({
  request,
  ld,
}) => {
  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { sourceRoot: "../src" },
  });
  expect(res.status()).toBe(200);

  const stored = JSON.parse(
    fs.readFileSync(path.join(ld.docsAbs, ".living-doc.json"), "utf-8"),
  );
  expect(stored.sourceRoot).toBe("../src");
  expect(stored.docsFolder).toBeUndefined();
});

test.describe("legacy config migration", () => {
  test.use({ fixtureName: "legacy-abs-paths" });

  test("absolute paths and docsFolder are silently migrated on first read", async ({
    ld,
  }) => {
    const stored = JSON.parse(
      fs.readFileSync(path.join(ld.docsAbs, ".living-doc.json"), "utf-8"),
    );
    expect(stored.docsFolder).toBeUndefined();
    expect(stored.sourceRoot).not.toMatch(/^\//);
    expect(stored.sourceRoot).toMatch(/\.\.?/);
    for (const entry of stored.extraFiles || []) {
      expect(path.isAbsolute(entry)).toBe(false);
    }
  });
});
