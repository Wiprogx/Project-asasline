"use client";

import { useCallback, useRef, useState } from "react";

export type UploadStatus = "uploading" | "done" | "failed" | "cancelled";

export type Upload = {
  id: string;
  file: File;
  /** Posted with the file (the paper's kind, a note…). */
  fields: Record<string, string>;
  /** 0..1, what the browser has sent so far. */
  progress: number;
  status: UploadStatus;
  message?: string;
};

type Answer = { ok?: boolean; error?: string; message?: string };

function answerOf(text: string): Answer | null {
  try {
    return JSON.parse(text) as Answer;
  } catch {
    return null;
  }
}

let counter = 0;

/**
 * A queue of files, each sent on its own request the moment it is added. XHR, not fetch:
 * fetch still cannot report how much of a body it has sent, and a 20 MB scan deserves a bar.
 * `check` refuses a file in the browser before a byte leaves (the server checks again);
 * `onSettled` hears every outcome. The server answers with an ActionResult as JSON.
 */
export function useUploads(
  url: string,
  options: { check?: (f: File) => string | null; onSettled?: (u: Upload) => void } = {},
) {
  const [items, setItems] = useState<Upload[]>([]);
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const { check, onSettled } = options;

  const patch = useCallback((id: string, p: Partial<Upload>) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }, []);

  const settle = useCallback(
    (u: Upload, p: Partial<Upload>) => {
      requests.current.delete(u.id);
      patch(u.id, p);
      onSettled?.({ ...u, ...p });
    },
    [patch, onSettled],
  );

  const start = useCallback(
    (u: Upload) => {
      const xhr = new XMLHttpRequest();
      requests.current.set(u.id, xhr);
      const fd = new FormData();
      for (const [k, v] of Object.entries(u.fields)) fd.set(k, v);
      fd.set("file", u.file);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) patch(u.id, { progress: e.loaded / e.total });
      };
      xhr.onload = () => {
        const a = answerOf(xhr.responseText);
        const ok = xhr.status < 300 && a?.ok === true;
        settle(u, {
          status: ok ? "done" : "failed",
          progress: ok ? 1 : 0,
          message: ok ? a?.message : (a?.error ?? `The server answered ${xhr.status}.`),
        });
      };
      xhr.onerror = () => settle(u, { status: "failed", message: "The connection dropped." });
      xhr.onabort = () => settle(u, { status: "cancelled", message: "Cancelled." });
      xhr.open("POST", url);
      xhr.send(fd);
    },
    [url, patch, settle],
  );

  const add = useCallback(
    (files: File[], fields: (f: File) => Record<string, string>) => {
      const fresh = files.map((file): Upload => {
        const problem = check?.(file) ?? null;
        return {
          id: `u${++counter}`,
          file,
          fields: fields(file),
          progress: 0,
          status: problem ? "failed" : "uploading",
          message: problem ?? undefined,
        };
      });
      setItems((xs) => [...fresh, ...xs]);
      for (const u of fresh) if (u.status === "uploading") start(u);
    },
    [check, start],
  );

  const retry = useCallback(
    (u: Upload) => {
      patch(u.id, { status: "uploading", progress: 0, message: undefined });
      start(u);
    },
    [patch, start],
  );

  const cancel = useCallback((id: string) => requests.current.get(id)?.abort(), []);
  const clearFinished = useCallback(
    () => setItems((xs) => xs.filter((x) => x.status === "uploading")),
    [],
  );

  return { items, add, retry, cancel, clearFinished };
}
