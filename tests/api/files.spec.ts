import fs from "node:fs";
import path from "node:path";
import { test, expect } from "../helpers/ld-fixture";

// Small text file encoded as base64 — used as the default upload payload.
const TEXT_B64 = Buffer.from("hello living-ai-documentation").toString(
  "base64",
);

async function uploadSample(request: any, baseURL: string, name = "note.txt", documentId?: string) {
  const res = await request.post(`${baseURL}/api/files/upload`, {
    data: { data: TEXT_B64, name, documentId },
  });
  expect(res.ok()).toBe(true);
  return (await res.json()) as { filename: string; url: string; size: number };
}

test("POST /api/files/upload saves a file with a slugged timestamped name", async ({
  request,
  ld,
}) => {
  const { filename } = await uploadSample(request, ld.baseURL);
  expect(filename).toMatch(/^\d{14}_[a-z0-9]{4}_note\.txt$/);
  expect(fs.existsSync(path.join(ld.docsAbs, "files", filename))).toBe(true);
});

test("POST /api/files/upload rejects a blocked extension", async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/files/upload`, {
    data: { data: TEXT_B64, name: "virus.exe" },
  });
  expect(res.status()).toBe(400);
  const body = (await res.json()) as { blockedExtension?: string };
  expect(body.blockedExtension).toBe("exe");
});

test("POST /api/files/upload rejects a file with no extension", async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/files/upload`, {
    data: { data: TEXT_B64, name: "noext" },
  });
  expect(res.status()).toBe(400);
});

test("POST /api/files/upload requires both data and name", async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/files/upload`, {
    data: { data: TEXT_B64 },
  });
  expect(res.status()).toBe(400);
});

test("GET /api/files lists uploaded files with display name + timestamp", async ({
  request,
  ld,
}) => {
  await uploadSample(request, ld.baseURL, "readme.md");
  const res = await request.get(`${ld.baseURL}/api/files`);
  const body = (await res.json()) as {
    files: Array<{
      filename: string;
      displayName: string;
      uploadedAt: string | null;
    }>;
  };
  expect(body.files.length).toBeGreaterThan(0);
  const entry = body.files.find((f) => f.displayName === "readme.md");
  expect(entry).toBeDefined();
  expect(entry?.uploadedAt).not.toBeNull();
});

test.describe("nested attachment folders", () => {
  test.use({ fixtureName: "with-subfolders" });

  test("upload stores attachments under files/<document-folder> and lists folder filters", async ({
    request,
    ld,
  }) => {
    const docId = encodeURIComponent("tutorials/advanced/2026_01_03_10_00_[Guide]_deep");
    const { filename, url } = await uploadSample(request, ld.baseURL, "deep note.txt", docId);

    expect(filename).toMatch(/^tutorials\/advanced\/\d{14}_[a-z0-9]{4}_deep_note\.txt$/);
    expect(url).toBe(`/files/${filename}`);
    expect(fs.existsSync(path.join(ld.docsAbs, "files", filename))).toBe(true);

    const res = await request.get(`${ld.baseURL}/api/files`);
    const body = (await res.json()) as {
      folders: string[];
      files: Array<{ filename: string; folder: string; displayName: string }>;
    };
    expect(body.folders).toEqual(["tutorials", "tutorials/advanced"]);
    expect(body.files).toContainEqual(expect.objectContaining({
      filename,
      folder: "tutorials/advanced",
      displayName: "deep_note.txt",
    }));
  });

  test("PUT and DELETE accept nested attachment filenames", async ({ request, ld }) => {
    const docId = encodeURIComponent("tutorials/2026_01_02_10_00_[Guide]_nested");
    const { filename } = await uploadSample(request, ld.baseURL, "nested.txt", docId);
    const newContent = Buffer.from("nested replacement").toString("base64");

    const put = await request.put(`${ld.baseURL}/api/files/${encodeURIComponent(filename)}`, {
      data: { data: newContent },
    });
    expect(put.ok()).toBe(true);
    expect(fs.readFileSync(path.join(ld.docsAbs, "files", filename), "utf-8")).toBe("nested replacement");

    const del = await request.delete(`${ld.baseURL}/api/files/${encodeURIComponent(filename)}`);
    expect(del.ok()).toBe(true);
    expect(fs.existsSync(path.join(ld.docsAbs, "files", filename))).toBe(false);
  });
});

test("PUT /api/files/:filename replaces an existing file in place", async ({
  request,
  ld,
}) => {
  const { filename } = await uploadSample(request, ld.baseURL);
  const newContent = Buffer.from("replaced content").toString("base64");
  const res = await request.put(`${ld.baseURL}/api/files/${filename}`, {
    data: { data: newContent },
  });
  expect(res.ok()).toBe(true);
  const onDisk = fs.readFileSync(
    path.join(ld.docsAbs, "files", filename),
    "utf-8",
  );
  expect(onDisk).toBe("replaced content");
});

test("PUT /api/files/:filename returns 404 when the file does not exist", async ({
  request,
  ld,
}) => {
  const res = await request.put(`${ld.baseURL}/api/files/does_not_exist.txt`, {
    data: { data: TEXT_B64 },
  });
  expect(res.status()).toBe(404);
});

test("DELETE /api/files/:filename removes the file from disk", async ({
  request,
  ld,
}) => {
  const { filename } = await uploadSample(request, ld.baseURL);
  const filePath = path.join(ld.docsAbs, "files", filename);
  expect(fs.existsSync(filePath)).toBe(true);
  const res = await request.delete(`${ld.baseURL}/api/files/${filename}`);
  expect(res.ok()).toBe(true);
  expect(fs.existsSync(filePath)).toBe(false);
});

test("DELETE /api/files/:filename rejects a path-traversal filename", async ({
  request,
  ld,
}) => {
  const res = await request.delete(
    `${ld.baseURL}/api/files/${encodeURIComponent("../foo.txt")}`,
  );
  expect(res.status()).toBe(400);
});
