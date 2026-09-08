import { AlertTriangle, ArrowRight, KeyRound } from "lucide-react";
import { unlamTransformConventions } from "@/academic";
import type { RelationalModel } from "@/domain/relational";
import type { TransformationTrace } from "@/domain/transformation";
import {
  presentRelationalModel,
  roleLabel,
  type PresentedAttribute,
} from "./present";

interface MrReadonlyViewProps {
  model: RelationalModel;
  trace?: TransformationTrace | null;
}

/**
 * Vista de SOLO LECTURA de un modelo relacional derivado: lista de esquemas con
 * la presentacion academica (PK subrayado, FK negrita, PK+FK ambas; el rol
 * tambien se rotula en texto para no depender solo del formato) y la
 * trazabilidad de la transformacion. La edicion del MR es del Incremento 5.
 */
export function MrReadonlyView({ model, trace }: MrReadonlyViewProps) {
  const schemas = presentRelationalModel(model, unlamTransformConventions.mrPresentation);

  if (schemas.length === 0) {
    return (
      <p className="text-xs text-neutral-400">
        El MR derivado no tiene esquemas (el DER de origen esta vacio).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {schemas.map((schema) => (
          <li key={schema.name} className="rounded-lg border border-neutral-200 p-3">
            <p className="mb-1.5 text-sm font-semibold text-neutral-800">{schema.name}</p>
            <ul className="space-y-0.5">
              {schema.attributes.map((attribute) => (
                <li key={attribute.name} className="flex items-center gap-2 text-xs">
                  <AttributeName attribute={attribute} />
                  {attribute.role !== "plain" && (
                    <span className="rounded border border-neutral-300 px-1 text-[10px] font-semibold text-neutral-500">
                      {roleLabel(attribute.role)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {schema.foreignKeys.length > 0 && (
              <ul className="mt-2 space-y-0.5 border-t border-neutral-100 pt-2">
                {schema.foreignKeys.map((fk, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-1 text-[11px] text-neutral-500"
                  >
                    <KeyRound size={11} aria-hidden />
                    ({fk.localAttributeNames.join(", ")})
                    <ArrowRight size={11} aria-hidden />
                    {fk.targetSchemaName}({fk.targetAttributeNames.join(", ")})
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {trace && trace.entries.length > 0 && (
        <section>
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Trazabilidad
          </p>
          <ul className="space-y-1">
            {trace.entries.map((entry) => (
              <li
                key={entry.id}
                className={`flex items-start gap-2 rounded-md border p-2 text-[11px] ${
                  entry.severity === "warning"
                    ? "border-amber-300 bg-amber-50"
                    : "border-neutral-200"
                }`}
              >
                {entry.severity === "warning" ? (
                  <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                ) : (
                  <span className="mt-0.5 shrink-0 font-mono text-neutral-400">{entry.ruleId}</span>
                )}
                <span className="min-w-0">
                  <span className="font-medium text-neutral-700">
                    Regla {entry.ruleId} · {entry.ruleTitle}
                  </span>
                  {entry.note && (
                    <span className="mt-0.5 block text-neutral-500">{entry.note}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AttributeName({ attribute }: { attribute: PresentedAttribute }) {
  const style: React.CSSProperties = {};
  if (attribute.emphasis === "underline" || attribute.emphasis === "underline+bold") {
    style.textDecoration = "underline";
    style.textUnderlineOffset = 2;
  }
  if (attribute.emphasis === "bold" || attribute.emphasis === "underline+bold") {
    style.fontWeight = 600;
  }
  return (
    <span className="text-neutral-700" style={style}>
      {attribute.name}
    </span>
  );
}
