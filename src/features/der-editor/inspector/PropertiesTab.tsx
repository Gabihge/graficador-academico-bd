import { MousePointerClick, Trash2, Unlink } from "lucide-react";
import type {
  CardinalityBound,
  ConceptualModel,
  Participation,
} from "@/domain/conceptual";
import { findAttributeOwner } from "@/domain/conceptual";
import { useDerEditorStore, type DerSelection } from "@/state/derEditorStore";
import { secondaryButton, textInput } from "@/components/ui/buttonStyles";
import { InlineTextField } from "./InlineTextField";
import { AttributeList } from "./AttributeList";

/** Pestana "Propiedades" del Inspector: contextual segun la seleccion del canvas. */
export function PropertiesTab() {
  const selection = useDerEditorStore((s) => s.selection);
  const model = useDerEditorStore((s) => s.model);

  if (!selection) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <MousePointerClick size={22} className="text-neutral-300" aria-hidden />
        <p className="text-xs text-neutral-400">
          Selecciona una entidad, relacion o atributo del canvas para ver y editar sus
          propiedades.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      <SelectionPanel selection={selection} model={model} />
    </div>
  );
}

function SelectionPanel({
  selection,
  model,
}: {
  selection: NonNullable<DerSelection>;
  model: ConceptualModel;
}) {
  if (selection.kind === "entity") {
    const entity = model.entities.find((e) => e.id === selection.id);
    if (!entity) return <MissingElement />;
    return <EntityPanel key={entity.id} entityId={entity.id} model={model} />;
  }
  if (selection.kind === "relationship") {
    const relationship = model.relationships.find((r) => r.id === selection.id);
    if (!relationship) return <MissingElement />;
    return <RelationshipPanel key={relationship.id} relationshipId={relationship.id} model={model} />;
  }
  const owner = findAttributeOwner(model, selection.id);
  if (!owner) return <MissingElement />;
  return <AttributePanel key={selection.id} attributeId={selection.id} model={model} />;
}

function MissingElement() {
  return (
    <p className="text-xs text-neutral-400">El elemento seleccionado ya no existe.</p>
  );
}

// --- Entidad ----------------------------------------------------------

function EntityPanel({ entityId, model }: { entityId: string; model: ConceptualModel }) {
  const entity = model.entities.find((e) => e.id === entityId)!;
  const renameElement = useDerEditorStore((s) => s.renameElement);
  const deleteElement = useDerEditorStore((s) => s.deleteElement);

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
        Entidad
      </p>
      <InlineTextField
        label="Nombre"
        value={entity.name}
        onCommit={(value) => renameElement("entity", entity.id, value)}
      />
      <AttributeList
        ownerKind="entity"
        ownerId={entity.id}
        attributes={entity.attributes}
        allowIdentifier
      />
      <button
        type="button"
        className={`${secondaryButton} w-full text-red-600`}
        onClick={() => deleteElement("entity", entity.id)}
      >
        <Trash2 size={14} aria-hidden />
        Eliminar entidad
      </button>
    </div>
  );
}

// --- Relacion -------------------------------------------------------

function RelationshipPanel({
  relationshipId,
  model,
}: {
  relationshipId: string;
  model: ConceptualModel;
}) {
  const relationship = model.relationships.find((r) => r.id === relationshipId)!;
  const renameElement = useDerEditorStore((s) => s.renameElement);
  const deleteElement = useDerEditorStore((s) => s.deleteElement);
  const disconnect = useDerEditorStore((s) => s.disconnect);
  const setEndCardinality = useDerEditorStore((s) => s.setEndCardinality);
  const setEndParticipation = useDerEditorStore((s) => s.setEndParticipation);

  const missing = 2 - relationship.ends.length;

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
        Relacion
      </p>
      <InlineTextField
        label="Nombre"
        value={relationship.name}
        onCommit={(value) => renameElement("relationship", relationship.id, value)}
      />

      <section>
        <span className="mb-1.5 block text-xs font-medium text-neutral-600">
          Extremos (cardinalidad y participacion)
        </span>
        {missing > 0 && (
          <p className="mb-2 rounded-md border border-dashed border-amber-300 bg-amber-50 px-2 py-2 text-xs text-amber-700">
            Faltan {missing} extremo{missing > 1 ? "s" : ""}. Arrastra desde el rombo hasta una
            entidad para conectarla.
          </p>
        )}
        <ul className="space-y-2">
          {relationship.ends.map((end) => {
            const entity = model.entities.find((e) => e.id === end.entityId);
            return (
              <li key={end.entityId} className="rounded-md border border-neutral-200 p-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="truncate text-xs font-medium text-neutral-700">
                    {entity?.name ?? "Entidad inexistente"}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-red-600"
                    onClick={() => disconnect(relationship.id, end.entityId)}
                  >
                    <Unlink size={12} aria-hidden />
                    Desconectar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-neutral-500">
                    Cardinalidad
                    <select
                      className={`${textInput} mt-0.5 py-1 text-xs`}
                      value={end.cardinality}
                      onChange={(event) =>
                        setEndCardinality(
                          relationship.id,
                          end.entityId,
                          event.target.value as CardinalityBound,
                        )
                      }
                    >
                      <option value="1">1</option>
                      <option value="N">N</option>
                    </select>
                  </label>
                  <label className="text-[11px] text-neutral-500">
                    Participacion
                    <select
                      className={`${textInput} mt-0.5 py-1 text-xs`}
                      value={end.participation}
                      onChange={(event) =>
                        setEndParticipation(
                          relationship.id,
                          end.entityId,
                          event.target.value as Participation,
                        )
                      }
                    >
                      <option value="partial">Parcial</option>
                      <option value="total">Total</option>
                    </select>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <AttributeList
        ownerKind="relationship"
        ownerId={relationship.id}
        attributes={relationship.attributes}
        allowIdentifier={false}
      />

      <button
        type="button"
        className={`${secondaryButton} w-full text-red-600`}
        onClick={() => deleteElement("relationship", relationship.id)}
      >
        <Trash2 size={14} aria-hidden />
        Eliminar relacion
      </button>
    </div>
  );
}

// --- Atributo -----------------------------------------------------

function AttributePanel({ attributeId, model }: { attributeId: string; model: ConceptualModel }) {
  const owner = findAttributeOwner(model, attributeId)!;
  const ownerObject =
    owner.kind === "entity"
      ? model.entities.find((e) => e.id === owner.id)
      : model.relationships.find((r) => r.id === owner.id);
  const attribute = ownerObject?.attributes.find((a) => a.id === attributeId);
  const renameElement = useDerEditorStore((s) => s.renameElement);
  const setAttributeIdentifier = useDerEditorStore((s) => s.setAttributeIdentifier);
  const deleteElement = useDerEditorStore((s) => s.deleteElement);
  const select = useDerEditorStore((s) => s.select);

  if (!attribute) return <MissingElement />;

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
        Atributo
      </p>
      <p className="text-xs text-neutral-500">
        Pertenece a{" "}
        <button
          type="button"
          className="font-medium text-neutral-700 underline underline-offset-2"
          onClick={() => select({ kind: owner.kind, id: owner.id })}
        >
          {ownerObject?.name ?? "(desconocido)"}
        </button>
      </p>
      <InlineTextField
        label="Nombre"
        value={attribute.name}
        onCommit={(value) => renameElement("attribute", attribute.id, value)}
      />
      {owner.kind === "entity" ? (
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input
            type="checkbox"
            checked={attribute.isIdentifier}
            onChange={(event) => setAttributeIdentifier(attribute.id, event.target.checked)}
          />
          Integra el identificador de la entidad (se subraya en Chen)
        </label>
      ) : (
        <p className="text-xs text-neutral-400">
          Los atributos de relacion no forman identificador en el Incremento 2.
        </p>
      )}
      <button
        type="button"
        className={`${secondaryButton} w-full text-red-600`}
        onClick={() => deleteElement("attribute", attribute.id)}
      >
        <Trash2 size={14} aria-hidden />
        Eliminar atributo
      </button>
    </div>
  );
}
