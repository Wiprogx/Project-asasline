import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LookupKind } from "@/domain/lookup-tables";
import { LOOKUP_META } from "../meta";

/** Settings › Lists: a card per list kept as its own table, each opening its editor. */
export function LookupIndex({ kinds, q = "" }: { kinds: readonly LookupKind[]; q?: string }) {
  const s = q.trim().toLowerCase();
  const shown = kinds.filter((k) =>
    [LOOKUP_META[k].title, LOOKUP_META[k].description].some((v) => v.toLowerCase().includes(s)),
  );
  if (shown.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">No list matches.</p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {shown.map((k) => (
        <li key={k}>
          <Link href={`/settings/lists/${k}`} className="block h-full rounded-xl hover:bg-muted/40">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{LOOKUP_META[k].title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {LOOKUP_META[k].description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
