// Estado del editor MR grafico (Incremento 5). Espejo de `derEditorStore`:
// orquesta las operaciones puras de `src/domain/relational` sobre el modelo del
// documento activo, mantiene el layout del canvas, un historial de undo/redo en
// memoria y la persistencia en Dexie (tabla `mrDocuments`).
//
// El MR puede ser DERIVADO de un DER (lleva `derivation` + `trace`). Cualquier
// edicion ESTRUCTURAL de un MR derivado marca `derivation.hasManualChanges`
// (sticky: no lo revierte un undo) para que la regeneracion del Incremento 4
// avise antes de sobrescribir (spec 10).

import { create } from "zustand";
import {
  addAttribute,
  addForeignKey,
  addSchema,
  collectRelationalElementIds,
  createRelationalAttribute,
  createRelationalModel,
  createSchema,
  findForeignKey,
  moveAttribute,
  removeAttribute,
  removeForeignKey,
  removeSchema,
  renameAttribute,
  renameSchema,
  setAttributeInPrimaryKey,
  setForeignKeyColumns,
  setForeignKeyTarget,
  type ForeignKeyPair,
  type MoveDirection,
  type RelationalModel,
} from "@/domain/relational";
import {
  createViewLayout,
  prunePositions,
  setPosition,
  type NodePosition,
  type ViewLayout,
} from "@/domain/view";
import type { MrDerivation, TransformationTrace } from "@/domain/transformation";
import * as mrRepo from "@/infrastructure/persistence/mrDocumentRepo";
import { useWorkspaceStore } from "./workspaceStore";

export type MrElementKind = "schema" | "attribute" | "foreignKey";
export type MrSelection = { kind: MrElementKind; id: string } | null;
export type MrEditorStatus = "idle" | "loading" | "ready";

interface Snapshot {
  model: RelationalModel;
  layout: ViewLayout;
}

const HISTORY_LIMIT = 100;
const PERSIST_DEBOUNCE_MS = 400;

interface MrEditorState {
  status: MrEditorStatus;
  documentId: string | null;
  model: RelationalModel;
  layout: ViewLayout;
  derivation: MrDerivation | null;
  trace: TransformationTrace | null;
  selection: MrSelection;
  past: Snapshot[];
  future: Snapshot[];

  load: (documentId: string) => Promise<void>;
  clear: () => void;
  select: (selection: MrSelection) => void;

  addSchema: (position: NodePosition) => string;
  renameSchema: (schemaId: string, name: string) => void;
  addAttributeTo: (schemaId: string) => string | null;
  renameAttribute: (attributeId: string, name: string) => void;
  moveAttribute: (schemaId: string, attributeId: string, direction: MoveDirection) => void;
  setAttributePk: (schemaId: string, attributeId: string, inPk: boolean) => void;

  addForeignKey: (ownerSchemaId: string, targetSchemaId: string) => string | null;
  setForeignKeyTarget: (foreignKeyId: string, targetSchemaId: string) => void;
  setForeignKeyColumns: (foreignKeyId: string, pairs: ForeignKeyPair[]) => void;

  renameElement: (kind: MrElementKind, id: string, name: string) => void;
  deleteElement: (kind: MrElementKind, id: string) => void;
  deleteSelection: () => void;

  beginInteraction: () => void;
  moveNode: (elementId: string, position: NodePosition) => void;
  endInteraction: () => void;

  undo: () => void;
  redo: () => void;
}

// --- Persistencia con debounce ------------------------------------------

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistPending:
  | {
      documentId: string;
      model: RelationalModel;
      layout: ViewLayout;
      derivation: MrDerivation | null;
      trace: TransformationTrace | null;
    }
  | null = null;

function schedulePersist(
  documentId: string,
  model: RelationalModel,
  layout: ViewLayout,
  derivation: MrDerivation | null,
  trace: TransformationTrace | null,
): void {
  persistPending = { documentId, model, layout, derivation, trace };
  useWorkspaceStore.getState().setSaveState("saving");
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => void flushPersist(), PERSIST_DEBOUNCE_MS);
}

async function flushPersist(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  const pending = persistPending;
  persistPending = null;
  if (!pending) return;
  try {
    await mrRepo.saveMrDocument({
      documentId: pending.documentId,
      model: pending.model,
      layout: pending.layout,
      derivation: pending.derivation ?? undefined,
      trace: pending.trace ?? undefined,
    });
  } finally {
    useWorkspaceStore.getState().setSaveState("saved");
  }
}

/** Fuerza la escritura pendiente. Util para tests deterministas y cierre. */
export function flushMrEditorPersistence(): Promise<void> {
  return flushPersist();
}

// --- Helpers puros -----------------------------------------------------

function pruneSelection(selection: MrSelection, model: RelationalModel): MrSelection {
  if (!selection) return null;
  const ids = new Set(collectRelationalElementIds(model));
  return ids.has(selection.id) ? selection : null;
}

function pruneLayout(model: RelationalModel, layout: ViewLayout): ViewLayout {
  return prunePositions(layout, new Set(model.schemas.map((schema) => schema.id)));
}

export const useMrEditorStore = create<MrEditorState>((set, get) => {
  /**
   * Aplica un cambio estructural: sube `revision`, marca `hasManualChanges` si
   * el MR es derivado, guarda snapshot en el historial, poda seleccion + layout
   * y programa la persistencia. `derivation`/`trace` NO entran al snapshot
   * (hasManualChanges es sticky).
   */
  function commit(next: { model?: RelationalModel; layout?: ViewLayout }): void {
    const state = get();
    if (!state.documentId) return;

    const structural = Boolean(next.model);
    const baseModel = next.model ?? state.model;
    const model = structural
      ? { ...baseModel, revision: state.model.revision + 1 }
      : baseModel;
    const layout = pruneLayout(model, next.layout ?? state.layout);

    const derivation =
      structural && state.derivation && !state.derivation.hasManualChanges
        ? { ...state.derivation, hasManualChanges: true }
        : state.derivation;

    const past = [...state.past, { model: state.model, layout: state.layout }];
    if (past.length > HISTORY_LIMIT) past.shift();

    set({
      model,
      layout,
      derivation,
      past,
      future: [],
      selection: pruneSelection(state.selection, model),
    });
    schedulePersist(state.documentId, model, layout, derivation, state.trace);
  }

  return {
    status: "idle",
    documentId: null,
    model: createRelationalModel(),
    layout: createViewLayout(),
    derivation: null,
    trace: null,
    selection: null,
    past: [],
    future: [],

    load: async (documentId) => {
      if (get().documentId === documentId && get().status === "ready") return;
      await flushPersist();
      set({
        status: "loading",
        documentId,
        model: createRelationalModel(),
        layout: createViewLayout(),
        derivation: null,
        trace: null,
        selection: null,
        past: [],
        future: [],
      });

      const record = await mrRepo.loadMrDocument(documentId);
      if (get().documentId !== documentId) return;

      if (record) {
        set({
          status: "ready",
          model: record.model,
          layout: record.layout,
          derivation: record.derivation ?? null,
          trace: record.trace ?? null,
        });
      } else {
        const model = createRelationalModel();
        const layout = createViewLayout();
        set({ status: "ready", model, layout });
        await mrRepo.saveMrDocument({ documentId, model, layout });
      }
    },

    clear: () => {
      void flushPersist();
      set({
        status: "idle",
        documentId: null,
        model: createRelationalModel(),
        layout: createViewLayout(),
        derivation: null,
        trace: null,
        selection: null,
        past: [],
        future: [],
      });
    },

    select: (selection) => set({ selection: pruneSelection(selection, get().model) }),

    addSchema: (position) => {
      const schema = createSchema();
      commit({
        model: addSchema(get().model, schema),
        layout: setPosition(get().layout, schema.id, position),
      });
      set({ selection: { kind: "schema", id: schema.id } });
      return schema.id;
    },

    renameSchema: (schemaId, name) => {
      commit({ model: renameSchema(get().model, schemaId, name) });
    },

    addAttributeTo: (schemaId) => {
      const { model } = get();
      if (!model.schemas.some((s) => s.id === schemaId)) return null;
      const attribute = createRelationalAttribute();
      // No se roba la seleccion: el usuario suele estar en el panel del esquema
      // agregando varios atributos y marcando PK en la lista.
      commit({ model: addAttribute(model, schemaId, attribute) });
      return attribute.id;
    },

    renameAttribute: (attributeId, name) => {
      commit({ model: renameAttribute(get().model, attributeId, name) });
    },

    moveAttribute: (schemaId, attributeId, direction) => {
      commit({ model: moveAttribute(get().model, schemaId, attributeId, direction) });
    },

    setAttributePk: (schemaId, attributeId, inPk) => {
      commit({ model: setAttributeInPrimaryKey(get().model, schemaId, attributeId, inPk) });
    },

    addForeignKey: (ownerSchemaId, targetSchemaId) => {
      const next = addForeignKey(get().model, ownerSchemaId, targetSchemaId);
      if (next === get().model) return null;
      const owner = next.schemas.find((s) => s.id === ownerSchemaId);
      const fk = owner?.foreignKeys[owner.foreignKeys.length - 1];
      commit({ model: next });
      if (fk) set({ selection: { kind: "foreignKey", id: fk.id } });
      return fk?.id ?? null;
    },

    setForeignKeyTarget: (foreignKeyId, targetSchemaId) => {
      commit({ model: setForeignKeyTarget(get().model, foreignKeyId, targetSchemaId) });
    },

    setForeignKeyColumns: (foreignKeyId, pairs) => {
      commit({ model: setForeignKeyColumns(get().model, foreignKeyId, pairs) });
    },

    renameElement: (kind, id, name) => {
      if (kind === "schema") get().renameSchema(id, name);
      else if (kind === "attribute") get().renameAttribute(id, name);
    },

    deleteElement: (kind, id) => {
      const { model } = get();
      if (kind === "schema") commit({ model: removeSchema(model, id) });
      else if (kind === "attribute") commit({ model: removeAttribute(model, id) });
      else commit({ model: removeForeignKey(model, id) });
    },

    deleteSelection: () => {
      const { selection } = get();
      if (selection) get().deleteElement(selection.kind, selection.id);
    },

    beginInteraction: () => {
      const state = get();
      if (!state.documentId) return;
      const past = [...state.past, { model: state.model, layout: state.layout }];
      if (past.length > HISTORY_LIMIT) past.shift();
      set({ past, future: [] });
    },

    moveNode: (elementId, position) => {
      set({ layout: setPosition(get().layout, elementId, position) });
    },

    endInteraction: () => {
      const { documentId, model, layout, derivation, trace } = get();
      if (documentId) schedulePersist(documentId, model, layout, derivation, trace);
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0 || !state.documentId) return;
      const previous = state.past[state.past.length - 1]!;
      set({
        model: previous.model,
        layout: previous.layout,
        past: state.past.slice(0, -1),
        future: [{ model: state.model, layout: state.layout }, ...state.future].slice(
          0,
          HISTORY_LIMIT,
        ),
        selection: pruneSelection(state.selection, previous.model),
      });
      schedulePersist(
        state.documentId,
        previous.model,
        previous.layout,
        state.derivation,
        state.trace,
      );
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0 || !state.documentId) return;
      const nextSnapshot = state.future[0]!;
      set({
        model: nextSnapshot.model,
        layout: nextSnapshot.layout,
        past: [...state.past, { model: state.model, layout: state.layout }].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        selection: pruneSelection(state.selection, nextSnapshot.model),
      });
      schedulePersist(
        state.documentId,
        nextSnapshot.model,
        nextSnapshot.layout,
        state.derivation,
        state.trace,
      );
    },
  };
});

export { findForeignKey };
