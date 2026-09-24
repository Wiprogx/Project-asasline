/**
 * The ports the office ships from and to, offered on every port field (`list="ports"`) as the
 * person types a code or a name. Rendered once, by the office layout.
 */
export function PortDatalist({
  ports,
}: {
  ports: readonly { code: string; name: string; country: string }[];
}) {
  return (
    <datalist id="ports">
      {ports.map((p) => (
        <option key={p.code} value={p.code}>
          {p.name} ({p.country})
        </option>
      ))}
    </datalist>
  );
}
