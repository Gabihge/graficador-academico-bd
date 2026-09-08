// Estado del editor DER. Orquesta las operaciones puras del dominio
// (src/domain/conceptual) sobre el modelo del documento activo, mantiene el
// layout del canvas (src/domain/view), un historial de undo/redo en memoria y
// la persistencia en Dexie (tabla `derDocuments`).
//
// Separacion de responsabilidades (docs/ARCHITECTURE.md):
// - MODELO y LAYOUT son estado persistente de dominio -> viven aca;
// - la seleccion tambien vive aca porque Inspector y canvas la comparten;
// - el estado efimero de UI (paneles, herramienta activa, pestana del
//   inspector) NO vive aca: vive en React state local del shell.
//
// El historial de undo/redo es por documento y NO se persiste.

import { create } from "zustand";
import {
  addAttribute,
  addComponent,
  addEntity,
  addHierarchy,
  addHierarchySub,
  addRelationship,
  collectElementIds,
  connect,
  createAttribute,
  createConceptualModel,
  createEntity,
  createHierarchy,
  createRelationship,
  disconnect,
  findAttribute,
  migrateConceptualModel,
  removeAttribute,
  removeEntity,
  removeHierarchy,
  removeHierarchySub,
  removeRelationship,
  renameAttribute,
  renameEntity,
  renameHierarchy,
  renameRelationship,
  setAttributeDiscriminator,
  setAttributeIdentifier,
  setAttributeKind,
  setEntityKind,
  setHierarchyDiscriminator,
  setHierarchyOverlap,
  setHierarchyPartition,
  setHierarchySuper,
  setParticipantCardinality,
  setParticipantParticipation,
  setParticipantRole,
  setRelationshipDegree,
  setRelationshipIdentifying,
  type AttributeKind,
  type CardinalityBound,
  type ConceptualElementKind,
  type ConceptualModel,
  type EntityKind,
  type HierarchyOverlap,
  type HierarchyPartition,
  type Participation,
  type RelationshipDegree,
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

  load: (documentId: string) => Promise<void>;
  clear: () => void;
  select: (selection: DerSelection) => void;

  addEntity: (position: NodePosition) => string;
  addRelationship: (position: NodePosition) => string;
  addHierarchy: (position: NodePosition) => string;
  addAttributeTo: (ownerKind: "entity" | "relationship", ownerId: string) => string | null;
  addComponentTo: (compositeAttributeId: string) => string | null;

  renameElement: (kind: ConceptualElementKind, id: string, name: string) => void;

  setEntityKind: (entityId: string, kind: EntityKind) => void;
  setAttributeKind: (attributeId: string, kind: AttributeKind) => void;
  setAttributeIdentifier: (attributeId: string, isIdentifier: boolean) => void;
  setAttributeDiscriminator: (attributeId: string, isDiscriminator: boolean) => void;

  setRelationshipDegree: (relationshipId: string, degree: RelationshipDegree) => void;
  setRelationshipIdentifying: (relationshipId: string, identifying: boolean) => void;
  connect: (relationshipId: string, entityId: string) => void;
  disconnect: (relationshipId: string, participantId: string) => void;
  setParticipantCardinality: (
    relationshipId: string,
    participantId: string,
    value: CardinalityBound,
  ) => void;
  setParticipantParticipation: (
    relationshipId: string,
    participantId: string,
    value: Participation,
  ) => void;
  setParticipantRole: (relationshipId: string, participantId: string, role: string) => void;

  connectHierarchy: (hierarchyId: string, entityId: string) => void;
  setHierarchySuper: (hierarchyId: string, entityId: string) => void;
  removeHierarchySub: (hierarchyId: string, entityId: string) => void;
  setHierarchyPartition: (hierarchyId: string, partition: HierarchyPartition) => void;
  setHierarchyOverlap: (hierarchyId: string, overlap: HierarchyOverlap) => void;
  setHierarchyDiscriminator: (hierarchyId: string, attributeId: string | undefined) => void;

  deleteElement: (kind: ConceptualElementKind, id: string) => void;
  deleteSelection: () => void;

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

/** Fuerza la escritura pendiente. Util para tests deterministas y cierre. */
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

/** Posicion escalonada para un nodo hijo (atributo o componente) de un dueno. */
function childPosition(layout: ViewLayout, ownerId: string, index: number): NodePosition {
  const ownerPos = layout.positions[ownerId] ?? { x: 0, y: 0 };
  return {
    x: ownerPos.x + 40 + (index % 3) * 130,
    y: ownerPos.y + 120 + Math.floor(index / 3) * 70,
  };
}

export const useDerEditorStore = create<DerEditorState>((set, get) => {
  /**
   * Aplica un cambio estructural: sube el `revision`, guarda el estado actual en
   * el historial, descarta el "rehacer" pendiente, poda seleccion y layout, y
   * programa la persistencia.
   */
  function commit(next: { model?: ConceptualModel; layout?: ViewLayout }): void {
    const state = get();
    if (!state.documentId) return;

    const baseModel = next.model ?? state.model;
    const model = next.model
      ? { ...baseModel, revision: state.model.revision + 1 }
      : baseModel;
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
      if (get().documentId !== documentId) return;

      if (record) {
        set({
          status: "ready",
          model: migrateConceptualModel(record.model),
          layout: record.layout,
        });
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

    addHierarchy: (position) => {
      const hierarchy = createHierarchy();
      commit({
        model: addHierarchy(get().model, hierarchy),
        layout: setPosition(get().layout, hierarchy.id, position),
      });
      set({ selection: { kind: "hierarchy", id: hierarchy.id } });
      return hierarchy.id;
    },

    addAttributeTo: (ownerKind, ownerId) => {
      const { model, layout } = get();
      const owner =
        ownerKind === "entity"
          ? model.entities.find((entity) => entity.id === ownerId)
          : model.relationships.find((relationship) => relationship.id === ownerId);
      if (!owner) return null;

      const attribute = createAttribute();
      const position = childPosition(layout, ownerId, owner.attributes.length);
      commit({
        model: addAttribute(model, ownerKind, ownerId, attribute),
        layout: setPosition(layout, attribute.id, position),
      });
      set({ selection: { kind: "attribute", id: attribute.id } });
      return attribute.id;
    },

    addComponentTo: (compositeAttributeId) => {
      const { model, layout } = get();
      const location = findAttribute(model, compositeAttributeId);
      if (!location || location.attribute.kind !== "composite") return null;
      const component = createAttribute();
      const index = location.attribute.components?.length ?? 0;
      const position = childPosition(layout, compositeAttributeId, index);
      commit({
        model: addComponent(model, compositeAttributeId, component),
        layout: setPosition(layout, component.id, position),
      });
      set({ selection: { kind: "attribute", id: component.id } });
      return component.id;
    },

    renameElement: (kind, id, name) => {
      const { model } = get();
      if (kind === "entity") commit({ model: renameEntity(model, id, name) });
      else if (kind === "relationship") commit({ model: renameRelationship(model, id, name) });
      else if (kind === "hierarchy") commit({ model: renameHierarchy(model, id, name) });
      else commit({ model: renameAttribute(model, id, name) });
    },

    setEntityKind: (entityId, kind) => {
      commit({ model: setEntityKind(get().model, entityId, kind) });
    },
    setAttributeKind: (attributeId, kind) => {
      commit({ model: setAttributeKind(get().model, attributeId, kind) });
    },
    setAttributeIdentifier: (attributeId, isIdentifier) => {
      commit({ model: setAttributeIdentifier(get().model, attributeId, isIdentifier) });
    },
    setAttributeDiscriminator: (attributeId, isDiscriminator) => {
      commit({ model: setAttributeDiscriminator(get().model, attributeId, isDiscriminator) });
    },

    setRelationshipDegree: (relationshipId, degree) => {
      commit({ model: setRelationshipDegree(get().model, relationshipId, degree) });
    },
    setRelationshipIdentifying: (relationshipId, identifying) => {
      commit({ model: setRelationshipIdentifying(get().model, relationshipId, identifying) });
    },
    connect: (relationshipId, entityId) => {
      commit({ model: connect(get().model, relationshipId, entityId) });
    },
    disconnect: (relationshipId, participantId) => {
      commit({ model: disconnect(get().model, relationshipId, participantId) });
    },
    setParticipantCardinality: (relationshipId, participantId, value) => {
      commit({
        model: setParticipantCardinality(get().model, relationshipId, participantId, value),
      });
    },
    setParticipantParticipation: (relationshipId, participantId, value) => {
      commit({
        model: setParticipantParticipation(get().model, relationshipId, participantId, value),
      });
    },
    setParticipantRole: (relationshipId, participantId, role) => {
      commit({ model: setParticipantRole(get().model, relationshipId, participantId, role) });
    },

    connectHierarchy: (hierarchyId, entityId) => {
      const hierarchy = get().model.hierarchies.find((h) => h.id === hierarchyId);
      if (!hierarchy) return;
      // Primera entidad conectada = supraentidad; el resto, subentidades.
      const model =
        hierarchy.superEntityId.trim().length === 0
          ? setHierarchySuper(get().model, hierarchyId, entityId)
          : addHierarchySub(get().model, hierarchyId, entityId);
      commit({ model });
    },
    setHierarchySuper: (hierarchyId, entityId) => {
      commit({ model: setHierarchySuper(get().model, hierarchyId, entityId) });
    },
    removeHierarchySub: (hierarchyId, entityId) => {
      commit({ model: removeHierarchySub(get().model, hierarchyId, entityId) });
    },
    setHierarchyPartition: (hierarchyId, partition) => {
      commit({ model: setHierarchyPartition(get().model, hierarchyId, partition) });
    },
    setHierarchyOverlap: (hierarchyId, overlap) => {
      commit({ model: setHierarchyOverlap(get().model, hierarchyId, overlap) });
    },
    setHierarchyDiscriminator: (hierarchyId, attributeId) => {
      commit({ model: setHierarchyDiscriminator(get().model, hierarchyId, attributeId) });
    },

    deleteElement: (kind, id) => {
      const { model } = get();
      if (kind === "entity") commit({ model: removeEntity(model, id) });
      else if (kind === "relationship") commit({ model: removeRelationship(model, id) });
      else if (kind === "hierarchy") commit({ model: removeHierarchy(model, id) });
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
      schedulePersist(state.documentId, previous.model, previous.layout);
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
      schedulePersist(state.documentId, nextSnapshot.model, nextSnapshot.layout);
    },
  };
});
