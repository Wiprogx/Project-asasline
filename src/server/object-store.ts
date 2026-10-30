import "server-only";
import { AwsClient } from "aws4fetch";
import { env } from "@/env";

/**
 * The office's bucket (OVH Object Storage, S3-compatible). Configured by the S3_* variables;
 * without them there is no bucket and files stay in FILES_DIR. Objects are only ever written
 * once and read: nothing here deletes, and the bucket keeps versions besides.
 */
let client: AwsClient | null | undefined;

function s3() {
  if (client !== undefined) return client;
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = env;
  client =
    S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY
      ? new AwsClient({
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
          service: "s3",
          region: S3_REGION,
        })
      : null;
  return client;
}

/** True when the S3_* variables name a bucket. */
export const hasBucket = () => s3() !== null;

/** Path-style URL of an object: `<endpoint>/<bucket>/<folder>/<name>`. */
function objectUrl(key: string) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${env.S3_ENDPOINT!.replace(/\/+$/, "")}/${env.S3_BUCKET}/${path}`;
}

export async function putObject(key: string, bytes: Uint8Array) {
  const res = await s3()!.fetch(objectUrl(key), {
    method: "PUT",
    body: bytes as Uint8Array<ArrayBuffer>,
  });
  if (!res.ok) throw new Error(`The bucket refused ${key}: ${res.status} ${await res.text()}`);
}

/** A web stream of the object, or null when the bucket has no such object. */
export async function getObject(key: string) {
  const res = await s3()!.fetch(objectUrl(key));
  if (res.status === 404) return null;
  if (!res.ok || !res.body) throw new Error(`The bucket refused ${key}: ${res.status}`);
  return res.body;
}
