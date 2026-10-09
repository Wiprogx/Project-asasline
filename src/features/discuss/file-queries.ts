import "server-only";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { messageFiles } from "@/server/db/schema";
import { openStoredFile } from "@/server/files";
import { auditAccess } from "@/server/access";

/** A message's attachment to send to the browser: its stream and headers, or null when it is not there. */
export async function messageFileForDownload(messageId: string, fileId: string) {
  const user = await requirePermission("app.discuss");
  const [f] = await db
    .select()
    .from(messageFiles)
    .where(and(eq(messageFiles.id, fileId), eq(messageFiles.messageId, messageId)));
  if (!f) return null;
  const stream = await openStoredFile(messageId, f.storedName, "messages");
  if (stream)
    await auditAccess("download", {
      action: "file.download",
      userId: user.id,
      entity: "message",
      entityId: messageId,
      detail: { file: f.id, name: f.name },
    });
  return stream ? { stream, name: f.name, mime: f.mime, size: f.sizeBytes } : null;
}
