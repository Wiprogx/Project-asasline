import { expect, test } from "./fixtures";

/** What a browser reads before anyone signs in: the manifest, the icons, the offline page. */
test("the manifest, the icons and the offline page are served without a session", async ({
  page,
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const body = await manifest.json();
  expect(body.name).toBe("ASASLINE TMS");
  expect(body.display).toBe("standalone");
  for (const icon of body.icons as { src: string }[]) {
    const r = await request.get(icon.src);
    expect(r.status(), icon.src).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["cache-control"]).toContain("no-cache");

  await page.goto("/offline");
  await expect(page.getByRole("heading", { level: 1, name: "You are offline" })).toBeVisible();
});
