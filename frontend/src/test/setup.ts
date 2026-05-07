import "@testing-library/jest-dom";

// jsdom does not implement scrollIntoView — stub it to prevent errors
// in components like AiChatSidebar that auto-scroll a message feed.
Element.prototype.scrollIntoView = vi.fn();

// Forcefully mock localStorage to ensure it has all required methods
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    length: 0, // Simplified for now
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
}
