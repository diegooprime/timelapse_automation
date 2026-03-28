import { put } from "@vercel/blob";
import { readFileSync, statSync } from "node:fs";

const MAX_UPLOAD_SIZE = 500 * 1024 * 1024; // 500 MB

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

  const fileSize = statSync(filePath).size;
  if (fileSize > MAX_UPLOAD_SIZE) {
    throw new Error(`File too large for upload: ${(fileSize / 1024 / 1024).toFixed(0)} MB (max 500 MB)`);
  }

  const fileBuffer = readFileSync(filePath);

  const blob = await put(blobName, fileBuffer, {
    access: "public",
    addRandomSuffix: false,
    token,
  });

  return blob.url;
}
