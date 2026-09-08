// Estado del editor DER (Incremento 2). Orquesta las operaciones puras del
// dominio (src/domain/conceptual) sobre el modelo del documento activo,
// mantiene el layout del canvas (src/domain/view), un historial de undo/redo
// en memoria y la persistencia en Dexie (tabla `derDocuments`).
//
// Separacion de responsabilidades (docs/ARCHITECTURE.md):
// - el MODELO y el LAYOUT son estado persistente de dominio -> viven aca;
// - la seleccion actual tambien vive aca porque el Inspector y el canvas la
//   comparten;
// - el estado efimero de UI (paneles abiertos, herramienta activa, pestana
//   del inspector) NO vive aca: vive en React state local del shell.
//
// El historial de undo/redo es por documento y NO se persiste: se descarta
// al cerrar o cambiar de documento.

import { create } from "zustand";
import {
  addAttribute,
  addEntity,
  addRelationship,
  collectElementIds,
  connect,
  createAttribute,
  createConceptualModel,
  createEntity,
  createRelationship,
  disconnect,
  findAttributeOwner,
  removeAttribute,
  removeEntity,
  removeRelationship,
  renameAttribute,
  renameEntity,
  renameRelationship,
  setAttributeIdentifier,
  setEndCardinality,
  setEndParticipation,
  type CardinalityBound,
  type ConceptualElementKind,
  type ConceptualModel,
  type Participation,
} from "@/domain/conceptual";
import {
  createViewLayout,
  prunePositions,
  setPosition,
  type NodePosition,
  type ViewLayout,
} from "@/domain/view";
import * as derRepo from "@/infrastructure/persistence/derDocumentRepo";
import { useWorkspaceStore } from "./workspaceStore";

export type DerSelection = { kind: ConceptualElementKind; id: string } | null;

export type DerEditorStatus = "idle" | "loading" | "ready";

interface Snapshot {
  model: ConceptualModel;
  layout: ViewLayout;
}

/** Tope del historial de undo/redo para no crecer sin limite. */
const HISTORY_LIMIT = 100;
const PERSIST_DEBOUNCE_MS = 400;

interface DerEditorState {
  status: DerEditorStatus;
  documentId: string | null;
  model: ConceptualModel;
  layout: ViewLayout;
  selection: DerSelection;
  past: Snapshot[];
  future: Snapshot[];

  /** Carga el contenido DER de un documento (o inicializa uno vacio y lo persiste). */
  load: (documentId: string) => Promise<void>;
  /** Descarta el editor (cerrar documento / proyecto / cambiar a un doc no-DER). */
  clear: () => void;

  select: (selection: DerSelection) => void;

  addEntity: (position: NodePosition) => string;
  addRelationship: (position: NodePosition) => string;
  addAttributeTo: (ownerKind: "entity" | "relationship", ownerId: string) => string | null;

  renameElement: (kind: ConceptualElementKind, id: string, name: string) => void;
  setAttributeIdentifier: (attributeId: string, isIdentifier: boolean) => void;

  connect: (relationshipId: string, entityId: string) => void;
  disconnect: (relationshipId: string, entityId: string) => void;
  setEndCardinality: (
    relationshipId: string,
    entityId: string,
    value: CardinalityBound,
  ) => void;
  setEndParticipation: (
    relationshipId: string,
    entityId: string,
    value: Participation,
  ) => void;

  deleteElement: (kind: ConceptualElementKind, id: string) => void;
  deleteSelection: () => void;

  /** Snapshot para un gesto continuo (arrastre) que reune varios movimientos. */
  beginInteraction: () => void;
  moveNode: (elementId: string, position: NodePosition) => void;
  endInteraction: () => void;

  undo: () => void;
  redo: () => void;
}

// --- Persistencia con debounce ------------------------------------------

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistPending: { documentId: string; model: ConceptualModel; layout: ViewLayout } | null = null;

function schedulePersist(documentId: string, model: ConceptualModel, layout: ViewLayout): void {
  persistPending = { documentId, model, layout };
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
    await derRepo.saveDerDocument(pending.documentId, pending.model, pending.layout);
  } finally {
    useWorkspaceStore.getState().setSaveState("saved");
  }
}

/**
 * Fuerza la escritura de cualquier cambio con persistencia pendiente. Util
 * para tests deterministas y como red de seguridad antes de descartar el
 * editor.
 */
export function flushDerEditorPersistence(): Promise<void> {
  return flushPersist();
}

// --- Helpers puros -----------------------------------------------------

function pruneSelection(selection: DerSelection, model: ConceptualModel): DerSelection {
  if (!selection) return null;
  const ids = new Set(collectElementIds(model));
  return ids.has(selection.id) ? selection : null;
}

function pruneLayout(model: ConceptualModel, layout: ViewLayout): ViewLayout {
  return prunePositions(layout, new Set(collectElementIds(model)));
}

export const useDerEditorStore = create<DerEditorState>((set, get) => {
  /**
   * Aplica un cambio estructural: guarda el estado actual en el historial,
   * descarta el "rehacer" pendiente, poda seleccion y layout, y programa la
   * persistencia.
   */
  function commit(next: { model?: ConceptualModel; layout?: ViewLayout }): void {
    const state = get();
    if (!state.documentId) return;

    const model = next.model ?? state.model;
    const layout = pruneLayout(model, next.layout ?? state.layout);

    const past = [...state.past, { model: state.model, layout: state.layout }];
    if (past.length > HISTORY_LIMIT) past.shift();

    set({
      model,
      layout,
      past,
      future: [],
      selection: pruneSelection(state.selection, model),
    });
    schedulePersist(state.documentId, model, layout);
  }

  return {
    status: "idle",
    documentId: null,
    model: createConceptualModel(),
    layout: createViewLayout(),
    selection: null,
    past: [],
    future: [],

    load: async (documentId) => {
      if (get().documentId === documentId && get().status === "ready") return;
      // Vacia cualquier escritura pendiente del documento anterior.
      await flushPersist();
      set({
        status: "loading",
        documentId,
        model: createConceptualModel(),
        layout: createViewLayout(),
        selection: null,
        past: [],
        future: [],
      });

      const record = await derRepo.loadDerDocument(documentId);
      if (get().documentId !== documentId) return; // cambio de documento durante la lectura

      if (record) {
        set({ status: "ready", model: record.model, layout: record.layout });
      } else {
        const model = createConceptualModel();
        const layout = createViewLayout();
        set({ status: "ready", model, layout });
        await derRepo.saveDerDocument(documentId, model, layout);
      }
    },

    clear: () => {
      void flushPersist();
      set({
        status: "idle",
        documentId: null,
        model: createConceptualModel(),
        layout: createViewLayout(),
        selection: null,
        past: [],
        future: [],
      });
    },

    select: (selection) => set({ selection: pruneSelection(selection, get().model) }),

    addEntity: (position) => {
      const entity = createEntity();
      commit({
        model: addEntity(get().model, entity),
        layout: setPosition(get().layout, entity.id, position),
      });
      set({ selection: { kind: "entity", id: entity.id } });
      return entity.id;
    },

    addRelationship: (position) => {
      const relationship = createRelationship();
      commit({
        model: addRelationship(get().model, relationship),
        layout: setPosition(get().layout, relationship.id, position),
      });
      set({ selection: { kind: "relationship", id: relationship.id } });
      return relationship.id;
    },

    addAttributeTo: (ownerKind, ownerId) => {
      const { model, layout } = get();
      const owner =
        ownerKind === "entity"
          ? model.entities.find((entity) => entity.id === ownerId)
          : model.relationships.find((relationship) => relationship.id === ownerId);
      if (!owner) return null;

      const attribute = createAttribute();
      // Posicion inicial del ovalo: debajo del dueno, escalonada por cantidad
      // de atributos que ya tiene, para que no se encimen.
      const ownerPos = layout.positions[ownerId] ?? { x: 0, y: 0 };
      const index = owner.attributes.length;
      const position = {
        x: ownerPos.x + 40 + (index % 3) * 130,
        y: ownerPos.y + 120 + Math.floor(index / 3) * 70,
      };

      commit({
        model: addAttribute(model, ownerKind, ownerId, attribute),
        layout: setPosition(layout, attribute.id, position),
      });
      set({ selection: { kind: "attribute", id: attribute.id } });
      return attribute.id;
    },

    renameElement: (kind, id, name) => {
      const { model } = get();
      if (kind === "entity") commit({ model: renameEntity(model, id, name) });
      else if (kind === "relationship") commit({ model: renameRelationship(model, id, name) });
      else commit({ model: renameAttribute(model, id, name) });
    },

    setAttributeIdentifier: (attributeId, isIdentifier) => {
      commit({ model: setAttributeIdentifier(get().model, attributeId, isIdentifier) });
    },

    connect: (relationshipId, entityId) => {
      commit({ model: connect(get().model, relationshipId, entityId) });
    },

    disconnect: (relationshipId, entityId) => {
      commit({ model: disconnect(get().model, relationshipId, entityId) });
    },

    setEndCardinality: (relationshipId, entityId, value) => {
      commit({ model: setEndCardinality(get().model, relationshipId, entityId, value) });
    },

    setEndParticipation: (relationshipId, entityId, value) => {
      commit({ model: setEndParticipation(get().model, relationshipId, entityId, value) });
    },

    deleteElement: (kind, id) => {
      const { model } = get();
      if (kind === "entity") commit({ model: removeEntity(model, id) });
      else if (kind === "relationship") commit({ model: removeRelationship(model, id) });
      else commit({ model: removeAttribute(model, id) });
    },

    deleteSelection: () => {
      const { selection } = get();
      if (!selection) return;
      get().deleteElement(selection.kind, selection.id);
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
      const { documentId, model, layout } = get();
      if (documentId) schedulePersist(documentId, model, layout);
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0 || !state.documentId) return;
      const previous = state.past[state.past.length - 1]!;
      const model = previous.model;
      const layout = previous.layout;
      set({
        model,
        layout,
        past: state.past.slice(0, -1),
        future: [{ model: state.model, layout: state.layout }, ...state.future].slice(
          0,
          HISTORY_LIMIT,
        ),
        selection: pruneSelection(state.selection, model),
      });
      schedulePersist(state.documentId, model, layout);
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0 || !state.documentId) return;
      const nextSnapshot = state.future[0]!;
      const model = nextSnapshot.model;
      const layout = nextSnapshot.layout;
      set({
        model,
        layout,
        past: [...state.past, { model: state.model, layout: state.layout }].slice(
          -HISTORY_LIMIT,
        ),
        future: state.future.slice(1),
        selection: pruneSelection(state.selection, model),
      });
      schedulePersist(state.documentId, model, layout);
    },
  };
});

/** Util para el Inspector: dado un atributo seleccionado, quien es su dueno. */
export function selectAttributeOwner(model: ConceptualModel, attributeId: string) {
  return findAttributeOwner(model, attributeId);
}
