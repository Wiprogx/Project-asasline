/**
 * Once, after migration 0050 (and after any legacy import): every live child address under a
 * contact becomes a contact of its own, linked to its parent. Idempotent.
 *   npm run db:convert-children
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { convertChildAddresses } = await import("../src/server/convert-child-addresses");
  const moved = await convertChildAddresses();
  console.log(`${moved} child address(es) moved to contacts`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
