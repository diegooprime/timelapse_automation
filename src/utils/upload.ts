import { put } from "@vercel/blob";
import { readFileSync } from "node:fs";

export function getVercelToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN ?? null;
}

export async function uploadToVercel(
  filePath: string,
  blobName: string
): Promise<string> {
  const token = getVercelToken();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN not set");
  }

  const fileBuffer = readFileSync(filePath);

  const blob = await put(blobName, fileBuffer, {
    access: "public",
    addRandomSuffix: false,
    token,
  });

  return blob.url;
}
