import { test, expect } from '../helpers/ld-fixture';

test.use({ channel: process.env.TEST_CHROME ? 'chrome' : undefined, launchOptions: { args: ['--enable-experimental-web-platform-features'] } });

test('workspace configuration remains editable with HTML-in-Canvas enabled', async ({ page, ld }) => {
  await page.goto(`${ld.baseURL}/workspace`);
  await expect(page.locator('#apiStatus')).toHaveText('HTML-in-Canvas active');
  await page.locator('#addButton').click();
  await expect(page.locator('#nodeName')).toHaveValue('LLM Provider 1');
  await expect(page.locator('#apiStatus')).toHaveText('HTML-in-Canvas active');
  await page.locator('#nodeName').fill('Configured provider');
  await expect(page.locator('#nodeName')).toHaveValue('Configured provider');
});

for (const label of ['Provider', 'Agent']) {
  test(`clicking the ${label} node opens its editable panel`, async ({ page, request, ld }) => {
    await request.put(`${ld.baseURL}/api/workspace`, { data: {
      version: 1, camera: { x: 500, y: 350, zoom: 0.6 }, entities: [
        { id: 'root', label: 'Root', kind: 'system', parentId: null, config: {} },
        { id: 'provider', label: 'Provider', kind: 'llm', parentId: 'root', config: {} },
        { id: 'agent', label: 'Agent', kind: 'agent', parentId: 'provider', config: {} },
      ],
    } });
    // Observe the real drawing coordinates so clicks follow layout and camera changes.
    await page.addInitScript(() => {
      const positions: Record<string, { x: number; y: number }> = {};
      Object.assign(window, { workspaceLabelPositions: positions });
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
        const point = new DOMPoint(x, y).matrixTransform(this.getTransform());
        positions[text] = {
          x: point.x * this.canvas.clientWidth / this.canvas.width,
          y: point.y * this.canvas.clientHeight / this.canvas.height,
        };
        if (maxWidth === undefined) fillText.call(this, text, x, y);
        else fillText.call(this, text, x, y, maxWidth);
      };
    });
    await page.goto(`${ld.baseURL}/workspace`);
    const position = () => page.evaluate(name => (
      window as unknown as { workspaceLabelPositions: Record<string, { x: number; y: number }> }
    ).workspaceLabelPositions[name], label);
    await expect.poll(position).toBeTruthy();
    await expect.poll(async () => {
      // A resize can recenter the camera between the first paint and the click.
      await page.locator('#workspaceCanvas').click({ position: await position() });
      return page.locator('#nodeName').inputValue();
    }).toBe(label);
    await page.locator('#nodeDescription').fill('Editable after selecting the node');
    await expect(page.locator('#nodeDescription')).toHaveValue('Editable after selecting the node');
    await expect(page.locator('#apiStatus')).toHaveText('HTML-in-Canvas active');
  });
}

for (const method of ['drawElementImage', 'requestPaint']) {
  test(`${method} failure switches to an editable DOM panel without losing the draft`, async ({ page, ld }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${ld.baseURL}/workspace`);
    await page.locator('#addButton').click();
    await page.locator('#nodeDescription').fill('Draft before canvas failure');

    // The API exists and has worked; fail its next use, as after a browser regression.
    await page.evaluate(methodName => {
      const prototype = methodName === 'drawElementImage'
        ? CanvasRenderingContext2D.prototype : HTMLCanvasElement.prototype;
      Object.defineProperty(prototype, methodName, {
        configurable: true,
        value() { throw new Error(`Simulated ${methodName} failure`); },
      });
    }, method);
    await page.locator('#fitButton').click();
    await expect(page.locator('#fallbackPanelHost')).toBeVisible();
    await expect(page.locator('#fallbackPanelHost #nodeDescription')).toHaveValue('Draft before canvas failure');
    await expect(page.locator('#apiStatus')).toHaveText('DOM fallback');
    await expect(page.locator('#apiStatus')).not.toHaveClass(/is-live/);

    await page.locator('#nodeDescription').fill('Edited in DOM fallback');
    await expect.poll(async () => {
      const saved = await page.request.get(`${ld.baseURL}/api/workspace`).then(r => r.json());
      return saved.entities.find((entity: { kind: string }) => entity.kind === 'llm')?.config.description;
    }).toBe('Edited in DOM fallback');
    await page.locator('#closePanelButton').click();
    await expect(page.locator('#fallbackPanelHost')).toBeHidden();
    await page.locator('#addButton').click();
    await expect(page.locator('#fallbackPanelHost #nodeName')).toHaveValue('LLM Provider 2');
    await page.locator('#nodeDescription').fill('Next provider remains editable');
    expect(errors).toEqual([]);
  });
}
