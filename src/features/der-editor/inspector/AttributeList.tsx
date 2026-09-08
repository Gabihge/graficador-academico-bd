import { Plus, Trash2 } from "lucide-react";
import type { AttributeKind, ConceptualAttribute } from "@/domain/conceptual";
import { useDerEditorStore } from "@/state/derEditorStore";
import { ghostIconButton, secondaryButton, textInput } from "@/components/ui/buttonStyles";

interface AttributeListProps {
  ownerKind: "entity" | "relationship";
  ownerId: string;
  attributes: ConceptualAttribute[];
  /** El identificador tiene sentido en atributos de entidad y en relaciones N:N. */
  allowIdentifier: boolean;
  /** El discriminante solo aplica a atributos de una entidad debil. */
  allowDiscriminator: boolean;
}

const ATTRIBUTE_KIND_LABELS: Record<AttributeKind, string> = {
  simple: "Simple",
  composite: "Compuesto",
  multivalued: "Multivaluado",
  derived: "Derivado / calculado",
};

/** Confirma un rename de atributo al perder foco, no en cada tecla. */
function commitName(
  current: string,
  next: string,
  onCommit: (value: string) => void,
  resetField: (value: string) => void,
): void {
  const trimmed = next.trim();
  if (trimmed.length > 0 && trimmed !== current) onCommit(trimmed);
  else resetField(current);
}

/** Lista editable de atributos de una entidad o relacion, con sus componentes. */
export function AttributeList({
  ownerKind,
  ownerId,
  attributes,
  allowIdentifier,
  allowDiscriminator,
}: AttributeListProps) {
  const renameElement = useDerEditorStore((s) => s.renameElement);
  const setAttributeKind = useDerEditorStore((s) => s.setAttributeKind);
  const setAttributeIdentifier = useDerEditorStore((s) => s.setAttributeIdentifier);
  const setAttributeDiscriminator = useDerEditorStore((s) => s.setAttributeDiscriminator);
  const deleteElement = useDerEditorStore((s) => s.deleteElement);
  const addAttributeTo = useDerEditorStore((s) => s.addAttributeTo);
  const addComponentTo = useDerEditorStore((s) => s.addComponentTo);
  const select = useDerEditorStore((s) => s.select);

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-600">Atributos</span>
        <button
          type="button"
          className={`${secondaryButton} px-2 py-1 text-xs`}
          onClick={() => addAttributeTo(ownerKind, ownerId)}
        >
          <Plus size={13} aria-hidden />
          Atributo
        </button>
      </div>

      {attributes.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-200 px-2 py-3 text-center text-xs text-neutral-400">
          Sin atributos.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {attributes.map((attribute) => (
            <li key={attribute.id} className="rounded-md border border-neutral-200 p-2">
              <div className="flex items-center gap-1">
                <input
                  key={`${attribute.id}:${attribute.name}`}
                  className={`${textInput} py-1 text-xs`}
                  defaultValue={attribute.name}
                  aria-label="Nombre del atributo"
                  onFocus={() => select({ kind: "attribute", id: attribute.id })}
                  onBlur={(event) =>
                    commitName(
                      attribute.name,
                      event.target.value,
                      (value) => renameElement("attribute", attribute.id, value),
                      (value) => {
                        event.target.value = value;
                      },
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <button
                  type="button"
                  className={ghostIconButton}
                  aria-label={`Eliminar atributo ${attribute.name}`}
                  onClick={() => deleteElement("attribute", attribute.id)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <label className="text-[11px] text-neutral-500">
                  Tipo{" "}
                  <select
                    className="rounded border border-neutral-200 px-1 py-0.5 text-xs text-neutral-700"
                    value={attribute.kind}
                    onChange={(event) =>
                      setAttributeKind(attribute.id, event.target.value as AttributeKind)
                    }
                  >
                    {(Object.keys(ATTRIBUTE_KIND_LABELS) as AttributeKind[]).map((kind) => (
                      <option key={kind} value={kind}>
                        {ATTRIBUTE_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </label>
                {allowIdentifier && (
                  <label className="flex items-center gap-1 text-[11px] text-neutral-600">
                    <input
                      type="checkbox"
                      checked={attribute.isIdentifier}
                      onChange={(event) =>
                        setAttributeIdentifier(attribute.id, event.target.checked)
                      }
                    />
                    Identificador
                  </label>
                )}
                {allowDiscriminator && (
                  <label className="flex items-center gap-1 text-[11px] text-neutral-600">
                    <input
                      type="checkbox"
                      checked={attribute.isDiscriminator === true}
                      onChange={(event) =>
                        setAttributeDiscriminator(attribute.id, event.target.checked)
                      }
                    />
                    Discriminante
                  </label>
                )}
              </div>

              {attribute.kind === "composite" && (
                <ComponentList
                  parentId={attribute.id}
                  components={attribute.components ?? []}
                  onAdd={() => addComponentTo(attribute.id)}
                  onRename={(componentId, value) =>
                    renameElement("attribute", componentId, value)
                  }
                  onDelete={(componentId) => deleteElement("attribute", componentId)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ComponentListProps {
  parentId: string;
  components: ConceptualAttribute[];
  onAdd: () => void;
  onRename: (componentId: string, value: string) => void;
  onDelete: (componentId: string) => void;
}

function ComponentList({ components, onAdd, onRename, onDelete }: ComponentListProps) {
  return (
    <div className="mt-2 border-l-2 border-neutral-200 pl-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium text-neutral-500">Componentes</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800"
          onClick={onAdd}
        >
          <Plus size={11} aria-hidden />
          Componente
        </button>
      </div>
      {components.length === 0 ? (
        <p className="text-[11px] text-neutral-400">Sin componentes.</p>
      ) : (
        <ul className="space-y-1">
          {components.map((component) => (
            <li key={component.id} className="flex items-center gap-1">
              <input
                key={`${component.id}:${component.name}`}
                className={`${textInput} py-0.5 text-[11px]`}
                defaultValue={component.name}
                aria-label="Nombre del componente"
                onBlur={(event) =>
                  commitName(
                    component.name,
                    event.target.value,
                    (value) => onRename(component.id, value),
                    (value) => {
                      event.target.value = value;
                    },
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
              <button
                type="button"
                className={ghostIconButton}
                aria-label={`Eliminar componente ${component.name}`}
                onClick={() => onDelete(component.id)}
              >
                <Trash2 size={13} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
