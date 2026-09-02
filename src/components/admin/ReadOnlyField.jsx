// Label-above-value pair used across the store and delivery-partner detail
// screens. Both previously declared their own identical copy.
export default function ReadOnlyField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">
        {value === undefined || value === null || value === "" ? "—" : value}
      </p>
    </div>
  );
}
