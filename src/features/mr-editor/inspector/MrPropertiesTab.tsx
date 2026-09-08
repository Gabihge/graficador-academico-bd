import { ArrowRight, ChevronDown, ChevronUp, Plus, Trash2, Unlink } from "lucide-react";
import {
  attributeName,
  findForeignKey,
  findRelationalAttribute,
  type ForeignKey,
  type RelationalModel,
  type RelationSchema,
} from "@/domain/relational";
import { useMrEditorStore, type MrSelection } from "@/state/mrEditorStore";
import { InlineTextField } from "@/components/ui/InlineTextField";
import { ghostIconButton, secondaryButton, textInput } from "@/components/ui/buttonStyles";

/** Pestana "Propiedades" del Inspector para el editor MR. */
export function MrPropertiesTab() {
  const selection = useMrEditorStore((s) => s.selection);
  const model = useMrEditorStore((s) => s.model);

  if (!selection) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-xs text-neutral-400">
          Selecciona una relacion, un atributo o una clave foranea del canvas para ver y editar sus
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
  selection: NonNullable<MrSelection>;
  model: RelationalModel;
}) {
  if (selection.kind === "schema") {
    const schema = model.schemas.find((s) => s.id === selection.id);
    return schema ? <SchemaPanel key={schema.id} schemaId={schema.id} model={model} /> : <Missing />;
  }
  if (selection.kind === "attribute") {
    return findRelationalAttribute(model, selection.id) ? (
      <AttributePanel key={selection.id} attributeId={selection.id} model={model} />
    ) : (
      <Missing />
    );
  }
  return findForeignKey(model, selection.id) ? (
    <ForeignKeyPanel key={selection.id} foreignKeyId={selection.id} model={model} />
  ) : (
    <Missing />
  );
}

function Missing() {
  return <p className="text-xs text-neutral-400">El elemento seleccionado ya no existe.</p>;
}

function PanelTitle({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">{children}</p>
  );
}

// --- Esquema ----------------------------------------------------------

function SchemaPanel({ schemaId, model }: { schemaId: string; model: RelationalModel }) {
  const schema = model.schemas.find((s) => s.id === schemaId)!;
  const renameSchema = useMrEditorStore((s) => s.renameSchema);
  const deleteElement = useMrEditorStore((s) => s.deleteElement);
  const addAttributeTo = useMrEditorStore((s) => s.addAttributeTo);
  const renameAttribute = useMrEditorStore((s) => s.renameAttribute);
  const moveAttribute = useMrEditorStore((s) => s.moveAttribute);
  const setAttributePk = useMrEditorStore((s) => s.setAttributePk);
  const addForeignKey = useMrEditorStore((s) => s.addForeignKey);
  const select = useMrEditorStore((s) => s.select);

  const otherSchemas = model.schemas.filter((s) => s.id !== schemaId);

  return (
    <div className="space-y-4">
      <PanelTitle>Relacion</PanelTitle>
      <InlineTextField
        label="Nombre"
        value={schema.name}
        onCommit={(value) => renameSchema(schema.id, value)}
      />

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-600">Atributos</span>
          <button
            type="button"
            className={`${secondaryButton} px-2 py-1 text-xs`}
            onClick={() => addAttributeTo(schema.id)}
          >
            <Plus size={13} aria-hidden />
            Atributo
          </button>
        </div>
        {schema.attributes.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-200 px-2 py-3 text-center text-xs text-neutral-400">
            Sin atributos.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {schema.attributes.map((attribute, index) => (
              <li key={attribute.id} className="rounded-md border border-neutral-200 p-2">
                <div className="flex items-center gap-1">
                  <input
                    key={`${attribute.id}:${attribute.name}`}
                    className={`${textInput} py-1 text-xs`}
                    defaultValue={attribute.name}
                    aria-label="Nombre del atributo"
                    onFocus={() => select({ kind: "attribute", id: attribute.id })}
                    onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (next.length > 0 && next !== attribute.name) {
                        renameAttribute(attribute.id, next);
                      } else {
                        event.target.value = attribute.name;
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                  <button
                    type="button"
                    className={ghostIconButton}
                    aria-label="Subir atributo"
                    disabled={index === 0}
                    onClick={() => moveAttribute(schema.id, attribute.id, "up")}
                  >
                    <ChevronUp size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={ghostIconButton}
                    aria-label="Bajar atributo"
                    disabled={index === schema.attributes.length - 1}
                    onClick={() => moveAttribute(schema.id, attribute.id, "down")}
                  >
                    <ChevronDown size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={ghostIconButton}
                    aria-label={`Eliminar atributo ${attribute.name}`}
                    onClick={() => deleteElement("attribute", attribute.id)}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
                <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-600">
                  <input
                    type="checkbox"
                    checked={schema.primaryKey.includes(attribute.id)}
                    onChange={(event) =>
                      setAttributePk(schema.id, attribute.id, event.target.checked)
                    }
                  />
                  Integra la clave primaria
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-600">Claves foraneas</span>
        </div>
        {schema.foreignKeys.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-200 px-2 py-3 text-center text-xs text-neutral-400">
            Sin FK. Arrastra de esta tabla a otra en el canvas, o agrega una:
          </p>
        ) : (
          <ul className="space-y-1">
            {schema.foreignKeys.map((fk) => (
              <li
                key={fk.id}
                className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 p-2 text-xs"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-neutral-700 hover:underline"
                  onClick={() => select({ kind: "foreignKey", id: fk.id })}
                >
                  <ForeignKeySummary fk={fk} owner={schema} model={model} />
                </button>
                <button
                  type="button"
                  className={ghostIconButton}
                  aria-label="Eliminar FK"
                  onClick={() => deleteElement("foreignKey", fk.id)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {otherSchemas.length > 0 && (
          <select
            className={`${textInput} mt-1.5 py-1 text-xs`}
            value=""
            aria-label="Agregar clave foranea"
            onChange={(event) => {
              if (event.target.value) addForeignKey(schema.id, event.target.value);
            }}
          >
            <option value="">+ Clave foranea hacia...</option>
            {otherSchemas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </section>

      <button
        type="button"
        className={`${secondaryButton} w-full text-red-600`}
        onClick={() => deleteElement("schema", schema.id)}
      >
        <Trash2 size={14} aria-hidden />
        Eliminar relacion
      </button>
    </div>
  );
}

function ForeignKeySummary({
  fk,
  owner,
  model,
}: {
  fk: ForeignKey;
  owner: RelationSchema;
  model: RelationalModel;
}) {
  const target = model.schemas.find((s) => s.id === fk.targetRelationId);
  const local = fk.localAttributeIds.map((id) => attributeName(owner, id)).join(", ");
  const targetCols = target
    ? fk.targetAttributeIds.map((id) => attributeName(target, id)).join(", ")
    : "?";
  return (
    <span className="inline-flex items-center gap-1">
      ({local || "?"}) <ArrowRight size={11} aria-hidden /> {target?.name ?? "?"}({targetCols})
    </span>
  );
}

// --- Atributo -------------------------------------------------------

function AttributePanel({ attributeId, model }: { attributeId: string; model: RelationalModel }) {
  const location = findRelationalAttribute(model, attributeId)!;
  const schema = model.schemas.find((s) => s.id === location.schemaId)!;
  const renameAttribute = useMrEditorStore((s) => s.renameAttribute);
  const setAttributePk = useMrEditorStore((s) => s.setAttributePk);
  const deleteElement = useMrEditorStore((s) => s.deleteElement);
  const select = useMrEditorStore((s) => s.select);

  return (
    <div className="space-y-4">
      <PanelTitle>Atributo</PanelTitle>
      <p className="text-xs text-neutral-500">
        Pertenece a{" "}
        <button
          type="button"
          className="font-medium text-neutral-700 underline underline-offset-2"
          onClick={() => select({ kind: "schema", id: schema.id })}
        >
          {schema.name}
        </button>
      </p>
      <InlineTextField
        label="Nombre"
        value={location.attribute.name}
        onCommit={(value) => renameAttribute(attributeId, value)}
      />
      <label className="flex items-center gap-2 text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={schema.primaryKey.includes(attributeId)}
          onChange={(event) => setAttributePk(schema.id, attributeId, event.target.checked)}
        />
        Integra la clave primaria (se subraya)
      </label>
      <button
        type="button"
        className={`${secondaryButton} w-full text-red-600`}
        onClick={() => deleteElement("attribute", attributeId)}
      >
        <Trash2 size={14} aria-hidden />
        Eliminar atributo
      </button>
    </div>
  );
}

// --- Clave foranea -------------------------------------------------

function ForeignKeyPanel({
  foreignKeyId,
  model,
}: {
  foreignKeyId: string;
  model: RelationalModel;
}) {
  const found = findForeignKey(model, foreignKeyId)!;
  const owner = model.schemas.find((s) => s.id === found.schemaId)!;
  const fk = found.foreignKey;
  const target = model.schemas.find((s) => s.id === fk.targetRelationId);
  const setForeignKeyTarget = useMrEditorStore((s) => s.setForeignKeyTarget);
  const setForeignKeyColumns = useMrEditorStore((s) => s.setForeignKeyColumns);
  const deleteElement = useMrEditorStore((s) => s.deleteElement);

  const pairs = fk.localAttributeIds.map((localAttributeId, i) => ({
    localAttributeId,
    targetAttributeId: fk.targetAttributeIds[i] ?? "",
  }));

  const setPair = (index: number, key: "localAttributeId" | "targetAttributeId", value: string) => {
    setForeignKeyColumns(
      fk.id,
      pairs.map((p, i) => (i === index ? { ...p, [key]: value } : p)),
    );
  };
  const addPair = () => {
    setForeignKeyColumns(fk.id, [
      ...pairs,
      {
        localAttributeId: owner.attributes[0]?.id ?? "",
        targetAttributeId: target?.primaryKey[0] ?? target?.attributes[0]?.id ?? "",
      },
    ]);
  };
  const removePair = (index: number) => {
    setForeignKeyColumns(
      fk.id,
      pairs.filter((_, i) => i !== index),
    );
  };

  return (
    <div className="space-y-4">
      <PanelTitle>Clave foranea</PanelTitle>
      <p className="text-xs text-neutral-500">
        En la relacion <span className="font-medium text-neutral-700">{owner.name}</span>
      </p>

      <label className="block text-xs text-neutral-600">
        Referencia a
        <select
          className={`${textInput} mt-1 py-1 text-xs`}
          value={fk.targetRelationId}
          onChange={(event) => setForeignKeyTarget(fk.id, event.target.value)}
        >
          {model.schemas
            .filter((s) => s.id !== owner.id)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </label>

      <section>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-600">Columnas (local -&gt; destino)</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800"
            onClick={addPair}
          >
            <Plus size={11} aria-hidden />
            Par
          </button>
        </div>
        {pairs.length === 0 ? (
          <p className="text-[11px] text-neutral-400">Sin columnas.</p>
        ) : (
          <ul className="space-y-1">
            {pairs.map((pair, index) => (
              <li key={index} className="flex items-center gap-1">
                <select
                  className={`${textInput} py-0.5 text-[11px]`}
                  value={pair.localAttributeId}
                  onChange={(event) => setPair(index, "localAttributeId", event.target.value)}
                >
                  <option value="">-</option>
                  {owner.attributes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <ArrowRight size={11} className="shrink-0 text-neutral-400" aria-hidden />
                <select
                  className={`${textInput} py-0.5 text-[11px]`}
                  value={pair.targetAttributeId}
                  onChange={(event) => setPair(index, "targetAttributeId", event.target.value)}
                >
                  <option value="">-</option>
                  {(target?.attributes ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={ghostIconButton}
                  aria-label="Quitar par"
                  onClick={() => removePair(index)}
                >
                  <Unlink size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        className={`${secondaryButton} w-full text-red-600`}
        onClick={() => deleteElement("foreignKey", fk.id)}
      >
        <Trash2 size={14} aria-hidden />
        Eliminar clave foranea
      </button>
    </div>
  );
}
