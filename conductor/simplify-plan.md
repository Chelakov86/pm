# Gemini Simplify: Refactoring Plan

Based on the parallel analysis by the specialized architect agents (`@abstraction`, `@clarity`, `@performance`, `@standards`), I have synthesized the following architectural refactoring plan tailored for your **FastAPI + React 19 / Next.js 16** stack.

## 1. Backend: Pythonic Modernization (FastAPI & SQLAlchemy)
*   **AI Client Lifecycle:** Transition from creating a synchronous `OpenAI` client per request to utilizing an `AsyncOpenAI` singleton via FastAPI's `lifespan` manager. This prevents thread-blocking and improves throughput.
*   **SQLAlchemy 2.0 Mapping:** Upgrade `backend/models.py` from legacy `Column` syntax to type-safe `Mapped` and `mapped_column` definitions.
*   **Type-Safe AI Contracts:** Refactor `backend/ai.py` to enforce the `schemas.BoardData` model in function signatures, and replace positional tuple returns in error handling with a clearer `NamedTuple` or dataclass.

## 2. Frontend: React 19 Simplification
*   **Remove Redundant Memoization:** Given the use of React 19 (which includes the React Compiler), manually wrapping functions in `useCallback` inside `useKanbanBoard.ts` and `useChat.ts` is obsolete. We will strip these out to clean up the code.
*   **State & Side-Effect Separation:** Fix the architectural anti-pattern in `useKanbanBoard.ts` where API calls (`saveBoard`) are triggered directly inside `setBoard` pure state updaters. We will isolate the transformation logic from the persistence logic.
*   **Race Condition Mitigation:** Enhance the board save debounce logic with an `AbortController` to prevent stale data updates during rapid successive edits.
*   **Component Decomposition:** Break down the monolithic `AiChatWidget.tsx` into smaller, single-responsibility sub-components (e.g., `MessageBubble`, `ChatInput`).

## Next Steps
Please review the proposed plan above. If you authorize these changes, I will proceed to surgically apply the fixes, run the linters/tests to verify system integrity, and perform final dead-code elimination.