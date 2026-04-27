# High level steps for project

## Part 1: Plan
Enrich this document to plan out each of these parts in detail, with substeps listed out as a checklist to be checked off by the agent, and with tests and success criteria for each. Also create an AGENTS.md file inside the frontend directory that describes the existing code there. Ensure the user checks and approves the plan.
- [x] Substeps:
  - [x] Analyze the `frontend` directory.
  - [x] Create `frontend/AGENTS.md` describing existing code.
  - [x] Update `docs/PLAN.md` with checklists, tests, and success criteria.
- [x] Tests: Manual review of the document by the user.
- [x] Success Criteria: `docs/PLAN.md` has concrete checklists for all 10 parts, `frontend/AGENTS.md` exists, and the user approves.

## Part 2: Scaffolding
Set up the Docker infrastructure, the backend in backend/ with FastAPI, and write the start and stop scripts in the scripts/ directory. This should serve example static HTML to confirm that a 'hello world' example works running locally and also make an API call.
- [x] Substeps:
  - [x] Create `Dockerfile` and `docker-compose.yml`.
  - [x] Create `backend/` directory with a basic FastAPI app.
  - [x] Use `uv` as the Python package manager in the Dockerfile.
  - [x] Serve a basic "Hello World" static HTML page at `/`.
  - [x] Add a dummy `/api/hello` endpoint.
  - [x] Create `scripts/start.sh`, `scripts/start.bat`, `scripts/stop.sh`, `scripts/stop.bat`.
- [x] Tests: Run start scripts, `curl http://localhost:8000/` returns the HTML, and `curl http://localhost:8000/api/hello` returns JSON.
- [x] Success Criteria: Start/stop scripts work on host machines, backend runs in Docker, endpoints respond successfully.

## Part 3: Add in Frontend
Now update so that the frontend is statically built and served, so that the app has the demo Kanban board displayed at /. Comprehensive unit and integration tests.
- [x] Substeps:
  - [x] Adjust Next.js config to `output: 'export'`.
  - [x] Modify Dockerfile/docker-compose to build the Next.js app and copy `out` folder to the backend static directory.
  - [x] Update FastAPI to mount and serve the Next.js static build at `/`.
- [x] Tests: Run the container, navigate to `http://localhost:8000/` and see the Next.js Kanban demo rendering properly. Ensure all frontend unit/integration tests pass.
- [x] Success Criteria: Frontend is served correctly from the FastAPI backend without needing a separate dev server.

## Part 4: Add in a fake user sign in experience
Now update so that on first hitting /, you need to log in with dummy credentials ("user", "password") in order to see the Kanban, and you can log out. Comprehensive tests.
- [x] Substeps:
  - [x] Create a Login page/component on the frontend.
  - [x] Implement fake auth logic (hardcoded "user"/"password").
  - [x] Save login state (e.g. in localStorage or Context).
  - [x] Add a "Log out" button on the Kanban board view.
- [x] Tests: Accessing `/` unauthenticated shows login. Invalid credentials fail. Valid credentials show Kanban. Logout returns to login.
- [x] Success Criteria: User cannot see the board without authenticating with dummy credentials.

## Part 5: Database modeling
Now propose a database schema for the Kanban, saving it as JSON. Document the database approach in docs/ and get user sign off.
- [ ] Substeps:
  - [x] Create a `Users` table and a `Boards` table in SQLite.
  - [x] The `Boards` table will store the Kanban state as a JSON column.
  - [x] Document the schema and the rationale in `docs/DATABASE.md`.
  - [x] Wait for user approval before implementing.
- [x] Tests: N/A (Documentation phase).
- [x] Success Criteria: User signs off on the SQLite + JSON approach.

## Part 6: Backend
Now add API routes to allow the backend to read and change the Kanban for a given user; test this thoroughly with backend unit tests. The database should be created if it doesn't exist.
- [x] Substeps:
  - [x] Set up SQLite connection and automatic table creation on startup.
  - [x] Create `GET /api/board` to fetch the board for the logged-in user.
  - [x] Create `PUT /api/board` to update the user's board.
  - [x] Write backend unit tests using FastAPI `TestClient`.
- [x] Tests: Automated unit tests verify CRUD operations on the SQLite database using valid and invalid inputs.
- [x] Success Criteria: Backend can persist and retrieve Kanban data for the hardcoded user.

## Part 7: Frontend + Backend
Now have the frontend actually use the backend API, so that the app is a proper persistent Kanban board. Test very throughly.
- [x] Substeps:
  - [x] Replace `initialData` in frontend with an API call to `GET /api/board` on mount.
  - [x] Update `KanbanBoard` state handlers (drag, add, delete, rename) to call `PUT /api/board` with the new state.
  - [x] Handle loading and error states in the UI.
- [x] Tests: Open app, move a card, reload page -> the card should remain in the new position. Add a card, reload -> card persists.
- [x] Success Criteria: The UI acts as a fully functional, persistent Kanban board backed by the database.

## Part 8: AI connectivity
Now allow the backend to make an AI call via OpenRouter. Test connectivity with a simple "2+2" test and ensure the AI call is working.
- [x] Substeps:
  - [x] Add `openai` or `requests` library to the Python backend to call OpenRouter.
  - [x] Load `OPENROUTER_API_KEY` from `.env`.
  - [x] Create a test endpoint `GET /api/ai/test` that asks the LLM a simple question (e.g. "What is 2+2?").
- [x] Tests: `curl http://localhost:8000/api/ai/test` returns "4" (or similar expected AI response).
- [x] Success Criteria: OpenRouter API key is validated and backend can successfully communicate with the LLM.

## Part 9: Now extend the backend call so that it always calls the AI with the JSON of the Kanban board, plus the user's question (and conversation history). The AI should respond with Structured Outputs that includes the response to the user and optionaly an update to the Kanban. Test thoroughly.
- [x] Substeps:
  - [x] Define a Pydantic schema for the LLM Structured Output (e.g., `{ "message": "string", "board_update": Optional[BoardData] }`).
  - [x] Create `POST /api/ai/chat` endpoint taking the user's message and chat history.
  - [x] In the endpoint, append the current database Kanban JSON to the system prompt.
  - [x] Parse the AI's response, and if `board_update` is present, update the SQLite database.
  - [x] Write tests to simulate a chat message and verify AI output formatting.
- [x] Tests: Send a prompt like "Add a card for 'Write Docs' to the Backlog". Verify the API returns a success message AND the database is updated.
- [x] Success Criteria: AI can reliably ingest the board state, reason about it, and return structurally valid JSON updates.

## Part 10: Now add a beautiful sidebar widget to the UI supporting full AI chat, and allowing the LLM (as it determines) to update the Kanban based on its Structured Outputs. If the AI updates the Kanban, then the UI should refresh automatically.
- [ ] Substeps:
  - [ ] Create a chat sidebar component in the frontend.
  - [ ] Implement a message feed (user vs AI messages).
  - [ ] Connect chat input to `POST /api/ai/chat`.
  - [ ] If the API response includes a board update, automatically set the React board state to reflect the changes seamlessly.
- [ ] Tests: Ask the AI via UI to move a card. The card should move instantly in the UI once the AI responds.
- [ ] Success Criteria: The user experiences a cohesive, "magical" workflow where conversing with the AI updates the application visually and persistently.