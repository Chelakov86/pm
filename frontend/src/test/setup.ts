import "@testing-library/jest-dom";

// jsdom does not implement scrollIntoView — stub it to prevent errors
// in components like AiChatSidebar that auto-scroll a message feed.
Element.prototype.scrollIntoView = vi.fn();
