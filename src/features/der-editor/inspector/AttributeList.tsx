import { Plus, Trash2 } from "lucide-react";
import type { ConceptualAttribute } from "@/domain/conceptual";
import { useDerEditorStore } from "@/state/derEditorStore";
import { ghostIconButton, secondaryButton, textInput } from "@/components/ui/buttonStyles";

interface AttributeListProps {
  ownerKind: "entity" | "relationship";
  ownerId: string;
  attributes: ConceptualAttribute[];
  /** El identificador solo tiene sentido en atributos de entidad (Incremento 2). */
  allowIdentifier: boolean;
}

/** Lista editable de atributos simples de una entidad o relacion. */
export function AttributeList({
  ownerKind,
  ownerId,
  attributes,
  allowIdentifier,
}: AttributeListProps) {
  const renameElement = useDerEditorStore((s) => s.renameElement);
  const setAttributeIdentifier = useDerEditorStore((s) => s.setAttributeIdentifier);
  const deleteElement = useDerEditorStore((s) => s.deleteElement);
  const addAttributeTo = useDerEditorStore((s) => s.addAttributeTo);
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
                  onBlur={(event) => {
                    const next = event.target.value.trim();
                    if (next.length > 0 && next !== attribute.name) {
                      renameElement("attribute", attribute.id, next);
                    } else {
                      event.target.value = attribute.name;
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  onFocus={() => select({ kind: "attribute", id: attribute.id })}
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
              {allowIdentifier && (
                <label className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    checked={attribute.isIdentifier}
                    onChange={(event) =>
                      setAttributeIdentifier(attribute.id, event.target.checked)
                    }
                  />
                  Integra el identificador (subrayado en Chen)
                </label>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
