// components/tile-count/browser/folder.ts
// Browser-only: reads a customer folder chosen or dropped by the employee. Only the
// first and last bytes of each file are read here. File names stay on this screen
// and never reach an export, because they often carry a customer's name.

import { HEAD_BYTES, screenFolder, TAIL_BYTES, type ScreenedEntry } from "@/lib/tile-count/io/upload";

export type QueueStatus = "waiting" | "open" | "done";

export interface QueueItem extends ScreenedEntry {
  file: File;
  status: QueueStatus;
}

async function bytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

export async function screenFiles(files: File[]): Promise<QueueItem[]> {
  const entries = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      sizeBytes: file.size,
      head: await bytes(file.slice(0, HEAD_BYTES)),
      tail: await bytes(file.slice(-TAIL_BYTES)),
    })),
  );
  return screenFolder(entries).map((entry) => ({ ...entry, file: files[entry.index], status: "waiting" }));
}

function readBatch(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

async function collect(entry: FileSystemEntry, into: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
    into.push(file);
    return;
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries returns a limited batch at a time, then an empty list.
  for (let batch = await readBatch(reader); batch.length > 0; batch = await readBatch(reader)) {
    for (const child of batch) await collect(child, into);
  }
}

/** Files from a drop, walking into dropped folders. The entries must be taken before the first await. */
export async function filesFromDrop(transfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(transfer.items)
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null);
  if (entries.length === 0) return Array.from(transfer.files);
  const files: File[] = [];
  for (const entry of entries) await collect(entry, files);
  return files;
}
