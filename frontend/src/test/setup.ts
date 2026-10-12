/// <reference types="@testing-library/jest-dom/vitest" />
import '@testing-library/jest-dom/vitest';

// JSDom polyfills
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

window.scrollTo = () => {};
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.Element.prototype.scrollIntoView = () => {};
}
