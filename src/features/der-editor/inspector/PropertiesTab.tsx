import { MousePointerClick, Trash2, Unlink } from "lucide-react";
import type {
  CardinalityBound,
  ConceptualModel,
  Participation,
  RelationshipDegree,
} from "@/domain/conceptual";
import { expectedParticipantCount, findAttribute } from "@/domain/conceptual";
import { useDerEditorStore, type DerSelection } from "@/state/derEditorStore";
import { secondaryButton, textInput } from "@/components/ui/buttonStyles";
import { InlineTextField } from "@/components/ui/InlineTextField";
import { AttributeList } from "./AttributeList";
import { HierarchyPanel } from "./HierarchyPanel";

/** Pestana "Propiedades" del Inspector: contextual segun la seleccion del canvas. */
export function PropertiesTab() {
  const selection = useDerEditorStore((s) => s.selection);
  const model = useDerEditorStore((s) => s.model);

  if (!selection) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <MousePointerClick size={22} className="text-neutral-300" aria-hidden />
        <p className="text-xs text-neutral-400">
          Selecciona una entidad, relacion, atributo o jerarquia del canvas para ver y editar sus
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
    return entity ? <EntityPanel key={entity.id} entityId={entity.id} model={model} /> : <MissingElement />;
  }
  if (selection.kind === "relationship") {
    const relationship = model.relationships.find((r) => r.id === selection.id);
    return relationship ? (
      <RelationshipPanel key={relationship.id} relationshipId={relationship.id} model={model} />
    ) : (
      <MissingElement />
    );
  }
  if (selection.kind === "hierarchy") {
    const hierarchy = model.hierarchies.find((h) => h.id === selection.id);
    return hierarchy ? (
      <HierarchyPanel key={hierarchy.id} hierarchyId={hierarchy.id} model={model} />
    ) : (
      <MissingElement />
    );
  }
  return findAttribute(model, selection.id) ? (
    <AttributePanel key={selection.id} attributeId={selection.id} model={model} />
  ) : (
    <MissingElement />
  );
}

function MissingElement() {
  return <p className="text-xs text-neutral-400">El elemento seleccionado ya no existe.</p>;
}

function PanelTitle({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">{children}</p>
  );
}

// --- Entidad --------------------------------------------------------------

function EntityPanel({ entityId, model }: { entityId: string; model: ConceptualModel }) {
  const entity = model.entities.find((e) => e.id === entityId)!;
  const renameElement = useDerEditorStore((s) => s.renameElement);
  const setEntityKind = useDerEditorStore((s) => s.setEntityKind);
  const deleteElement = useDerEditorStore((s) => s.deleteElement);
  const isWeak = entity.kind === "weak";

  return (
    <div className="space-y-4">
      <PanelTitle>Entidad</PanelTitle>
      <InlineTextField
        label="Nombre"
        value={entity.name}
        onCommit={(value) => renameElement("entity", entity.id, value)}
      />

      <div
        className="flex rounded-lg border border-neutral-200 bg-white/60 p-0.5 text-xs font-medium"
        role="group"
        aria-label="Tipo de entidad"
      >
        {(["regular", "weak"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={entity.kind === kind}
            onClick={() => setEntityKind(entity.id, kind)}
            className={`flex-1 rounded-md px-2 py-1 transition-colors ${
              entity.kind === kind
                ? "bg-neutral-800 text-white"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {kind === "regular" ? "Regular" : "Debil"}
          </button>
        ))}
      </div>
      {isWeak && (
        <p className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-2 py-2 text-[11px] text-neutral-500">
          Una entidad debil necesita un atributo <strong>discriminante</strong> y participar en una
          relacion marcada como <strong>identificadora</strong> hacia su entidad fuerte.
        </p>
      )}

      <AttributeList
        ownerKind="entity"
        ownerId={entity.id}
        attributes={entity.attributes}
        allowIdentifier
        allowDiscriminator={isWeak}
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

// --- Relacion -----------------------------------------------------------

const DEGREE_OPTIONS: { value: RelationshipDegree; label: string }[] = [
  { value: 1, label: "Unaria" },
  { value: 2, label: "Binaria" },
  { value: 3, label: "Ternaria" },
];

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
  const setRelationshipDegree = useDerEditorStore((s) => s.setRelationshipDegree);
  const setRelationshipIdentifying = useDerEditorStore((s) => s.setRelationshipIdentifying);
  const setParticipantCardinality = useDerEditorStore((s) => s.setParticipantCardinality);
  const setParticipantParticipation = useDerEditorStore((s) => s.setParticipantParticipation);
  const setParticipantRole = useDerEditorStore((s) => s.setParticipantRole);

  const expected = expectedParticipantCount(relationship.degree);
  const missing = expected - relationship.participants.length;
  const isUnary = relationship.degree === 1;

  return (
    <div className="space-y-4">
      <PanelTitle>Relacion</PanelTitle>
      <InlineTextField
        label="Nombre"
        value={relationship.name}
        onCommit={(value) => renameElement("relationship", relationship.id, value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-neutral-500">
          Grado
          <select
            className={`${textInput} mt-0.5 py-1 text-xs`}
            value={relationship.degree}
            onChange={(event) =>
              setRelationshipDegree(
                relationship.id,
                Number(event.target.value) as RelationshipDegree,
              )
            }
          >
            {DEGREE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 flex items-center gap-1.5 text-[11px] text-neutral-600">
          <input
            type="checkbox"
            checked={relationship.identifying === true}
            onChange={(event) =>
              setRelationshipIdentifying(relationship.id, event.target.checked)
            }
          />
          Identificadora (entidad debil)
        </label>
      </div>

      <section>
        <span className="mb-1.5 block text-xs font-medium text-neutral-600">
          {isUnary ? "Extremos (roles, cardinalidad, participacion)" : "Participantes"}
        </span>
        {missing > 0 && (
          <p className="mb-2 rounded-md border border-dashed border-amber-300 bg-amber-50 px-2 py-2 text-xs text-amber-700">
            Faltan {missing} {missing > 1 ? "participantes" : "participante"} para el grado{" "}
            {relationship.degree}. {isUnary ? "En una unaria se conecta dos veces la misma entidad." : "Arrastra desde el rombo hasta una entidad."}
          </p>
        )}
        <ul className="space-y-2">
          {relationship.participants.map((participant, index) => {
            const entity = model.entities.find((e) => e.id === participant.entityId);
            return (
              <li key={participant.id} className="rounded-md border border-neutral-200 p-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="truncate text-xs font-medium text-neutral-700">
                    {entity?.name ?? "Entidad inexistente"}
                    {isUnary ? ` · extremo ${index + 1}` : ""}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-red-600"
                    onClick={() => disconnect(relationship.id, participant.id)}
                  >
                    <Unlink size={12} aria-hidden />
                    Quitar
                  </button>
                </div>

                {(isUnary || participant.role) && (
                  <input
                    key={`${participant.id}:${participant.role ?? ""}`}
                    className={`${textInput} mb-2 py-1 text-xs`}
                    placeholder="Rol (ej. jefe / subordinado)"
                    aria-label="Rol del participante"
                    defaultValue={participant.role ?? ""}
                    onBlur={(event) =>
                      setParticipantRole(relationship.id, participant.id, event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-neutral-500">
                    Cardinalidad
                    <select
                      className={`${textInput} mt-0.5 py-1 text-xs`}
                      value={participant.cardinality}
                      onChange={(event) =>
                        setParticipantCardinality(
                          relationship.id,
                          participant.id,
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
                      value={participant.participation}
                      onChange={(event) =>
                        setParticipantParticipation(
                          relationship.id,
                          participant.id,
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
        allowIdentifier
        allowDiscriminator={false}
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

// --- Atributo -----------------------------------------------------------

function AttributePanel({ attributeId, model }: { attributeId: string; model: ConceptualModel }) {
  const location = findAttribute(model, attributeId)!;
  const { attribute, ownerKind, ownerId, parentAttributeId } = location;
  const ownerEntity =
    ownerKind === "entity" ? model.entities.find((e) => e.id === ownerId) : undefined;
  const ownerRelationship =
    ownerKind === "relationship"
      ? model.relationships.find((r) => r.id === ownerId)
      : undefined;
  const ownerName = ownerEntity?.name ?? ownerRelationship?.name ?? "(desconocido)";
  const ownerIsWeakEntity = ownerEntity?.kind === "weak";

  const renameElement = useDerEditorStore((s) => s.renameElement);
  const setAttributeKind = useDerEditorStore((s) => s.setAttributeKind);
  const setAttributeIdentifier = useDerEditorStore((s) => s.setAttributeIdentifier);
  const setAttributeDiscriminator = useDerEditorStore((s) => s.setAttributeDiscriminator);
  const deleteElement = useDerEditorStore((s) => s.deleteElement);
  const select = useDerEditorStore((s) => s.select);

  const isComponent = Boolean(parentAttributeId);

  return (
    <div className="space-y-4">
      <PanelTitle>{isComponent ? "Componente" : "Atributo"}</PanelTitle>
      <p className="text-xs text-neutral-500">
        Pertenece a{" "}
        <button
          type="button"
          className="font-medium text-neutral-700 underline underline-offset-2"
          onClick={() =>
            parentAttributeId
              ? select({ kind: "attribute", id: parentAttributeId })
              : select({ kind: ownerKind, id: ownerId })
          }
        >
          {parentAttributeId
            ? "su atributo compuesto"
            : ownerName}
        </button>
      </p>
      <InlineTextField
        label="Nombre"
        value={attribute.name}
        onCommit={(value) => renameElement("attribute", attribute.id, value)}
      />

      {!isComponent && (
        <label className="block text-xs text-neutral-600">
          Tipo de atributo
          <select
            className={`${textInput} mt-1 py-1 text-xs`}
            value={attribute.kind}
            onChange={(event) =>
              setAttributeKind(attribute.id, event.target.value as typeof attribute.kind)
            }
          >
            <option value="simple">Simple</option>
            <option value="composite">Compuesto</option>
            <option value="multivalued">Multivaluado</option>
            <option value="derived">Derivado / calculado</option>
          </select>
        </label>
      )}

      <label className="flex items-center gap-2 text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={attribute.isIdentifier}
          onChange={(event) => setAttributeIdentifier(attribute.id, event.target.checked)}
        />
        Integra el identificador (se subraya en Chen)
      </label>

      {ownerIsWeakEntity && !isComponent && (
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input
            type="checkbox"
            checked={attribute.isDiscriminator === true}
            onChange={(event) => setAttributeDiscriminator(attribute.id, event.target.checked)}
          />
          Es discriminante de la entidad debil
        </label>
      )}

      <button
        type="button"
        className={`${secondaryButton} w-full text-red-600`}
        onClick={() => deleteElement("attribute", attribute.id)}
      >
        <Trash2 size={14} aria-hidden />
        Eliminar {isComponent ? "componente" : "atributo"}
      </button>
    </div>
  );
}
