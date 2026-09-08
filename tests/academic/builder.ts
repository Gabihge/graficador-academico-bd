// Builder minimo para armar ConceptualModel de test de forma legible. No usa
// las fabricas de dominio para poder fijar ids estables y comparar por
// semantica (spec seccion 26).

import type {
  CardinalityBound,
  ConceptualAttribute,
  ConceptualModel,
  Hierarchy,
  HierarchyOverlap,
  HierarchyPartition,
  Participation,
  Relationship,
  RelationshipDegree,
} from "@/domain/conceptual";

interface AttrSpec {
  name: string;
  kind?: ConceptualAttribute["kind"];
  identifier?: boolean;
  discriminator?: boolean;
  components?: AttrSpec[];
}

interface ParticipantSpec {
  entity: string;
  cardinality: CardinalityBound;
  participation?: Participation;
  role?: string;
}

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function toAttribute(spec: AttrSpec): ConceptualAttribute {
  const attribute: ConceptualAttribute = {
    id: id("attr"),
    name: spec.name,
    kind: spec.kind ?? "simple",
    isIdentifier: spec.identifier ?? false,
  };
  if (spec.discriminator) attribute.isDiscriminator = true;
  if (attribute.kind === "composite") {
    attribute.components = (spec.components ?? []).map(toAttribute);
  }
  return attribute;
}

export class ModelBuilder {
  private model: ConceptualModel = {
    entities: [],
    relationships: [],
    hierarchies: [],
    revision: 0,
  };
  private ids = new Map<string, string>();

  entity(key: string, opts: { weak?: boolean; attrs?: AttrSpec[] } = {}): this {
    const entityId = id("ent");
    this.ids.set(key, entityId);
    this.model.entities.push({
      id: entityId,
      name: key,
      kind: opts.weak ? "weak" : "regular",
      attributes: (opts.attrs ?? []).map(toAttribute),
    });
    return this;
  }

  relationship(
    key: string,
    opts: {
      degree?: RelationshipDegree;
      identifying?: boolean;
      participants: ParticipantSpec[];
      attrs?: AttrSpec[];
    },
  ): this {
    const relationship: Relationship = {
      id: id("rel"),
      name: key,
      degree: opts.degree ?? (opts.participants.length as RelationshipDegree),
      participants: opts.participants.map((p) => ({
        id: id("part"),
        entityId: this.ref(p.entity),
        cardinality: p.cardinality,
        participation: p.participation ?? "partial",
        ...(p.role ? { role: p.role } : {}),
      })),
      attributes: (opts.attrs ?? []).map(toAttribute),
    };
    if (opts.identifying) relationship.identifying = true;
    this.ids.set(key, relationship.id);
    this.model.relationships.push(relationship);
    return this;
  }

  hierarchy(
    key: string,
    opts: {
      super: string;
      subs: string[];
      partition: HierarchyPartition;
      overlap: HierarchyOverlap;
      discriminatorAttr?: string;
    },
  ): this {
    const hierarchy: Hierarchy = {
      id: id("hier"),
      name: key,
      superEntityId: this.ref(opts.super),
      subEntityIds: opts.subs.map((s) => this.ref(s)),
      partition: opts.partition,
      overlap: opts.overlap,
    };
    if (opts.discriminatorAttr) {
      const superEntity = this.model.entities.find((e) => e.id === hierarchy.superEntityId);
      const attr = superEntity?.attributes.find((a) => a.name === opts.discriminatorAttr);
      if (attr) hierarchy.discriminatorAttributeId = attr.id;
    }
    this.ids.set(key, hierarchy.id);
    this.model.hierarchies.push(hierarchy);
    return this;
  }

  /** id real de un elemento por su clave; acepta un id crudo si no se registro. */
  ref(key: string): string {
    return this.ids.get(key) ?? key;
  }

  build(): ConceptualModel {
    return structuredClone(this.model);
  }
}

export function model(): ModelBuilder {
  return new ModelBuilder();
}
