// Estado del visor de MR (Incremento 4). SOLO LECTURA: el MR se produce por
// transformacion automatica desde un DER; la edicion llega en el Incremento 5.
// Mantiene el RelationalModel + su derivacion + su trazabilidad del documento
// activo cuando ese documento es de tipo `mr` (o `combined`).

import { create } from "zustand";
import { createRelationalModel, type RelationalModel } from "@/domain/relational";
import type { MrDerivation, TransformationTrace } from "@/domain/transformation";
import * as mrRepo from "@/infrastructure/persistence/mrDocumentRepo";

export type MrStatus = "idle" | "loading" | "ready" | "empty";

interface MrState {
  status: MrStatus;
  documentId: string | null;
  model: RelationalModel;
  derivation: MrDerivation | null;
  trace: TransformationTrace | null;

  load: (documentId: string) => Promise<void>;
  clear: () => void;
}

export const useMrStore = create<MrState>((set, get) => ({
  status: "idle",
  documentId: null,
  model: createRelationalModel(),
  derivation: null,
  trace: null,

  load: async (documentId) => {
    set({ status: "loading", documentId });
    const record = await mrRepo.loadMrDocument(documentId);
    if (get().documentId !== documentId) return;
    if (!record) {
      set({
        status: "empty",
        model: createRelationalModel(),
        derivation: null,
        trace: null,
      });
      return;
    }
    set({
      status: "ready",
      model: record.model,
      derivation: record.derivation ?? null,
      trace: record.trace ?? null,
    });
  },

  clear: () =>
    set({
      status: "idle",
      documentId: null,
      model: createRelationalModel(),
      derivation: null,
      trace: null,
    }),
}));
