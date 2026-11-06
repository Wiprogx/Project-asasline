import { mkdtemp, mkdir, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const dir = await mkdtemp(join(tmpdir(), "asl-files-"));
vi.mock("@/env", () => ({ env: { FILES_DIR: dir } }));

const store = vi.hoisted(() => ({
  hasBucket: vi.fn(() => true),
  putObject: vi.fn(async () => {}),
  getObject: vi.fn(async (): Promise<ReadableStream<Uint8Array> | null> => null),
}));
vi.mock("./object-store", () => store);

const { FILE_OWNERS, openStoredFile, storeFile } = await import("./files");
const bytes = new Uint8Array([1, 2, 3]);
const streamOf = (b: Uint8Array) =>
  new Blob([b as Uint8Array<ArrayBuffer>]).stream() as ReadableStream<Uint8Array>;
const read = async (s: ReadableStream<Uint8Array>) =>
  new Uint8Array(await new Response(s).arrayBuffer());

beforeEach(() => store.hasBucket.mockReturnValue(true));
afterEach(() => vi.clearAllMocks());

describe("storeFile with a bucket", () => {
  it.each(FILE_OWNERS)("writes a %s file to the bucket under its owner key", async (owner) => {
    const key = await storeFile("id-1", `${owner}.pdf`, bytes, owner);
    expect(key).toBe(`${owner}/id-1/${owner}.pdf`);
    expect(store.putObject).toHaveBeenCalledWith(key, bytes);
  });

  it("writes nothing to disk when the bucket takes the file", async () => {
    await storeFile("id-2", "a.pdf", bytes, "bookings");
    await expect(readdir(join(dir, "bookings"))).rejects.toThrow();
  });

  it("refuses a name that would leave the files folder", async () => {
    await expect(storeFile("..", "../x.pdf", bytes, "bookings")).rejects.toThrow(/outside/);
    expect(store.putObject).not.toHaveBeenCalled();
  });
});

describe("storeFile without a bucket", () => {
  it("writes the file under FILES_DIR/<owner>/<id>", async () => {
    store.hasBucket.mockReturnValue(false);
    const p = await storeFile("id-3", "b.pdf", bytes, "invoices");
    expect(p).toBe(join(dir, "invoices", "id-3", "b.pdf"));
    expect(await readdir(join(dir, "invoices", "id-3"))).toEqual(["b.pdf"]);
    expect(store.putObject).not.toHaveBeenCalled();
  });
});

describe("openStoredFile", () => {
  it.each(FILE_OWNERS)("reads a %s file from the bucket first", async (owner) => {
    store.getObject.mockResolvedValueOnce(streamOf(bytes));
    const s = await openStoredFile("id-4", "c.pdf", owner);
    expect(store.getObject).toHaveBeenCalledWith(`${owner}/id-4/c.pdf`);
    expect(await read(s!)).toEqual(bytes);
  });

  it("falls back to a file kept on disk before the bucket", async () => {
    await mkdir(join(dir, "messages", "id-5"), { recursive: true });
    await writeFile(join(dir, "messages", "id-5", "d.pdf"), bytes);
    const s = await openStoredFile("id-5", "d.pdf", "messages");
    expect(store.getObject).toHaveBeenCalledOnce();
    expect(await read(s!)).toEqual(bytes);
  });

  it("is null when the file is neither in the bucket nor on disk", async () => {
    expect(await openStoredFile("id-6", "e.pdf", "contacts")).toBeNull();
  });
});
