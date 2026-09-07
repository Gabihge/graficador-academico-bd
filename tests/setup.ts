import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

// jsdom no implementa ResizeObserver ni matchMedia, que React Flow y
// algunos primitives de Radix consultan al montar. Polyfills minimos para
// poder renderizar el shell completo en tests de componente.
if (!("ResizeObserver" in globalThis)) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
