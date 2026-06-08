import { estimateOperationBatchBytes } from "@/lib/tickets/check-in";

const DB_NAME = "ventry-check-ins";
const DB_VERSION = 1;
const SNAPSHOT_STORE = "snapshots";
const OPERATION_STORE = "operations";

export type CheckInSnapshotRegistration = {
  id: string;
  ticketId: number;
  attendeeName: string;
  status: string;
  checkedInAt: string | null;
  checkInCount: number;
  ticketTier: string | null;
  bookedItems: Array<{
    id: string;
    name: string;
    type: "TICKET" | "ACCOMMODATION" | "ADDON";
  }>;
  eligible: boolean;
  eligibilityReason: string | null;
};

export type CheckInSnapshot = {
  event: {
    id: number;
    name: string;
    scanOnce: boolean;
    snapshotUpdatedAt: string;
    eventUpdatedAt: string;
  };
  registrations: CheckInSnapshotRegistration[];
};

export type PendingCheckInOperation = {
  clientOperationId: string;
  eventId: number;
  ticketId: number;
  scannedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE);
      }
      if (!db.objectStoreNames.contains(OPERATION_STORE)) {
        const store = db.createObjectStore(OPERATION_STORE, { keyPath: "clientOperationId" });
        store.createIndex("eventId", "eventId");
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function loadSnapshot(eventId: number): Promise<CheckInSnapshot | null> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SNAPSHOT_STORE, "readonly");
    const request = transaction.objectStore(SNAPSHOT_STORE).get(String(eventId));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as CheckInSnapshot | undefined) || null);
    transaction.oncomplete = () => db.close();
  });
}

export async function saveSnapshot(snapshot: CheckInSnapshot): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SNAPSHOT_STORE, "readwrite");
    transaction.objectStore(SNAPSHOT_STORE).put(snapshot, String(snapshot.event.id));
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

export async function addPendingOperation(operation: PendingCheckInOperation): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OPERATION_STORE, "readwrite");
    transaction.objectStore(OPERATION_STORE).put(operation);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

export async function listPendingOperations(eventId: number): Promise<PendingCheckInOperation[]> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OPERATION_STORE, "readonly");
    const request = transaction.objectStore(OPERATION_STORE).getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const operations = (request.result as PendingCheckInOperation[]).filter(operation => operation.eventId === eventId);
      resolve(operations);
    };
    transaction.oncomplete = () => db.close();
  });
}

export async function deletePendingOperations(operationIds: string[]): Promise<void> {
  if (operationIds.length === 0) {
    return;
  }

  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OPERATION_STORE, "readwrite");
    const store = transaction.objectStore(OPERATION_STORE);
    for (const id of operationIds) {
      store.delete(id);
    }
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

export function chunkPendingOperations(operations: PendingCheckInOperation[], maxBytes = 100 * 1024) {
  const chunks: PendingCheckInOperation[][] = [];
  let current: PendingCheckInOperation[] = [];

  for (const operation of operations) {
    const candidate = [...current, operation];
    if (current.length > 0 && estimateOperationBatchBytes(candidate) > maxBytes) {
      chunks.push(current);
      current = [operation];
      continue;
    }
    current = candidate;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}
