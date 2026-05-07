import { expect, test } from "@playwright/test";

const INITIAL_BOARD = {
  columns: [
    { id: "col-todo", title: "To Do", cardIds: ["card-1"] },
    { id: "col-dev", title: "In Progress", cardIds: [] },
    { id: "col-review", title: "Review", cardIds: [] },
    { id: "col-done", title: "Done", cardIds: [] },
    { id: "col-backlog", title: "Backlog", cardIds: [] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Initial Task",
      details: "Test detail",
    },
  },
};

test.beforeEach(async ({ page, request }) => {
  // Reset board state via API
  await request.put("http://localhost:8000/api/board", {
    data: { state: INITIAL_BOARD },
  });

  await page.goto("/");
  
  // Ensure we are logged in
  await page.getByPlaceholder("Enter your username").fill("user");
  await page.getByPlaceholder("Enter your password").fill("password");
  await page.locator('button[type="submit"]').click();

  // Wait for board
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
});

test("loads the kanban board", async ({ page }) => {
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  const cardTitle = `Playwright card ${Date.now()}`;
  
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill(cardTitle);
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  
  await expect(firstColumn.getByText(cardTitle)).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  const targetColumn = page.getByTestId("column-col-review");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
});

test("persists board state after reload", async ({ page }) => {
  // Add a card
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  const cardTitle = `Persistent card ${Date.now()}`;
  
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill(cardTitle);
  
  // Start waiting for the PUT request BEFORE clicking add
  const putRequestPromise = page.waitForRequest(
    req => req.url().includes("/api/board") && req.method() === "PUT"
  );
  const putResponsePromise = page.waitForResponse(
    resp => resp.url().includes("/api/board") && resp.status() === 200
  );

  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText(cardTitle)).toBeVisible();

  console.log(`Debug: Created card with title "${cardTitle}", waiting for persistence...`);

  // Wait for the debounced PUT request to finish
  await putRequestPromise;
  await putResponsePromise;

  // Reload the page
  const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes("/api/board") && resp.status() === 200),
    page.reload()
  ]);

  const boardData = await response.json();
  console.log(`Debug: Board state after reload: ${JSON.stringify(boardData.state)}`);

  // Verify the card is still there
  await expect(page.getByText(cardTitle)).toBeVisible();
});
