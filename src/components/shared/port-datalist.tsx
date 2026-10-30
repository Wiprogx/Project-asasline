import { type Port, portHint } from "@/domain/ports";

/**
 * The ports the office ships from and to (Settings › Ports), offered on every port field
 * (`list="ports"`) as the person types a code or a name. Rendered once, by the office layout.
 */
export function PortDatalist({ ports }: { ports: readonly Port[] }) {
  return (
    <datalist id="ports">
      {ports.map((p) => (
        <option key={p.code} value={p.code}>
          {portHint(p)}
        </option>
      ))}
    </datalist>
  );
}
