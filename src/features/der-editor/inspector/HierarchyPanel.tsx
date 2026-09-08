import { Trash2, Unlink } from "lucide-react";
import {
  flattenAttributes,
  type ConceptualModel,
  type HierarchyOverlap,
  type HierarchyPartition,
} from "@/domain/conceptual";
import { useDerEditorStore } from "@/state/derEditorStore";
import { secondaryButton, textInput } from "@/components/ui/buttonStyles";
import { InlineTextField } from "./InlineTextField";

/** Panel del Inspector para una jerarquia de generalizacion/especializacion. */
export function HierarchyPanel({
  hierarchyId,
  model,
}: {
  hierarchyId: string;
  model: ConceptualModel;
}) {
  const hierarchy = model.hierarchies.find((h) => h.id === hierarchyId)!;
  const renameElement = useDerEditorStore((s) => s.renameElement);
  const deleteElement = useDerEditorStore((s) => s.deleteElement);
  const setHierarchySuper = useDerEditorStore((s) => s.setHierarchySuper);
  const removeHierarchySub = useDerEditorStore((s) => s.removeHierarchySub);
  const connectHierarchy = useDerEditorStore((s) => s.connectHierarchy);
  const setHierarchyPartition = useDerEditorStore((s) => s.setHierarchyPartition);
  const setHierarchyOverlap = useDerEditorStore((s) => s.setHierarchyOverlap);
  const setHierarchyDiscriminator = useDerEditorStore((s) => s.setHierarchyDiscriminator);

  const superEntity = model.entities.find((e) => e.id === hierarchy.superEntityId);
  const usedIds = new Set([hierarchy.superEntityId, ...hierarchy.subEntityIds]);
  const availableEntities = model.entities.filter((e) => !usedIds.has(e.id));
  const discriminatorAllowed =
    hierarchy.partition === "total" && hierarchy.overlap === "exclusive";
  const superAttributes = superEntity ? flattenAttributes(superEntity.attributes) : [];

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">Jerarquia</p>
      <InlineTextField
        label="Nombre"
        value={hierarchy.name}
        onCommit={(value) => renameElement("hierarchy", hierarchy.id, value)}
      />

      <section>
        <span className="mb-1 block text-xs font-medium text-neutral-600">Supraentidad</span>
        <div className="flex items-center gap-2 rounded-md border border-neutral-200 p-2 text-xs">
          <span className="flex-1 truncate text-neutral-700">
            {superEntity?.name ?? <span className="text-amber-600">sin asignar</span>}
          </span>
          {superEntity && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-neutral-400 hover:text-red-600"
              onClick={() => setHierarchySuper(hierarchy.id, "")}
            >
              <Unlink size={12} aria-hidden />
              Quitar
            </button>
          )}
        </div>
      </section>

      <section>
        <span className="mb-1 block text-xs font-medium text-neutral-600">Subentidades</span>
        {hierarchy.subEntityIds.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-200 px-2 py-2 text-center text-[11px] text-neutral-400">
            Sin subentidades.
          </p>
        ) : (
          <ul className="space-y-1">
            {hierarchy.subEntityIds.map((subId) => {
              const sub = model.entities.find((e) => e.id === subId);
              return (
                <li
                  key={subId}
                  className="flex items-center gap-2 rounded-md border border-neutral-200 p-2 text-xs"
                >
                  <span className="flex-1 truncate text-neutral-700">
                    {sub?.name ?? "Entidad inexistente"}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-neutral-400 hover:text-red-600"
                    onClick={() => removeHierarchySub(hierarchy.id, subId)}
                  >
                    <Unlink size={12} aria-hidden />
                    Quitar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {availableEntities.length > 0 && (
          <select
            className={`${textInput} mt-1.5 py-1 text-xs`}
            value=""
            aria-label="Agregar entidad a la jerarquia"
            onChange={(event) => {
              if (event.target.value) connectHierarchy(hierarchy.id, event.target.value);
            }}
          >
            <option value="">
              {superEntity ? "Agregar subentidad..." : "Asignar supraentidad..."}
            </option>
            {availableEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-neutral-500">
          Particion
          <select
            className={`${textInput} mt-0.5 py-1 text-xs`}
            value={hierarchy.partition}
            onChange={(event) =>
              setHierarchyPartition(hierarchy.id, event.target.value as HierarchyPartition)
            }
          >
            <option value="partial">Parcial</option>
            <option value="total">Total</option>
          </select>
        </label>
        <label className="text-[11px] text-neutral-500">
          Solapamiento
          <select
            className={`${textInput} mt-0.5 py-1 text-xs`}
            value={hierarchy.overlap}
            onChange={(event) =>
              setHierarchyOverlap(hierarchy.id, event.target.value as HierarchyOverlap)
            }
          >
            <option value="exclusive">Exclusiva</option>
            <option value="overlapping">Solapada</option>
          </select>
        </label>
      </div>

      <label className="block text-[11px] text-neutral-500">
        Atributo discriminante
        <select
          className={`${textInput} mt-0.5 py-1 text-xs disabled:opacity-50`}
          value={hierarchy.discriminatorAttributeId ?? ""}
          disabled={!discriminatorAllowed || superAttributes.length === 0}
          onChange={(event) =>
            setHierarchyDiscriminator(hierarchy.id, event.target.value || undefined)
          }
        >
          <option value="">(ninguno)</option>
          {superAttributes.map((attribute) => (
            <option key={attribute.id} value={attribute.id}>
              {attribute.name}
            </option>
          ))}
        </select>
        <span className="mt-0.5 block text-neutral-400">
          Solo se admite con particion total y solapamiento exclusivo (convencion de catedra).
        </span>
      </label>

      <button
        type="button"
        className={`${secondaryButton} w-full text-red-600`}
        onClick={() => deleteElement("hierarchy", hierarchy.id)}
      >
        <Trash2 size={14} aria-hidden />
        Eliminar jerarquia
      </button>
    </div>
  );
}
