import { describe, it, expect } from "vitest";
import {
  createViewLayout,
  getPosition,
  prunePositions,
  setPosition,
} from "@/domain/view";

describe("ViewLayout", () => {
  it("guarda y lee posiciones sin mutar el layout previo", () => {
    const base = createViewLayout();
    const next = setPosition(base, "n1", { x: 10, y: 20 });
    expect(getPosition(next, "n1")).toEqual({ x: 10, y: 20 });
    expect(getPosition(base, "n1")).toBeUndefined();
  });

  it("prunePositions descarta las posiciones de elementos que ya no existen", () => {
    let layout = createViewLayout();
    layout = setPosition(layout, "a", { x: 0, y: 0 });
    layout = setPosition(layout, "b", { x: 1, y: 1 });
    layout = setPosition(layout, "c", { x: 2, y: 2 });

    const pruned = prunePositions(layout, new Set(["a", "c"]));
    expect(Object.keys(pruned.positions).sort()).toEqual(["a", "c"]);
  });
});
