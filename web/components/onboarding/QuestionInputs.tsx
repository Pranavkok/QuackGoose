export function RadioOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
        selected
          ? 'border-black bg-black text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
      }`}
    >
      {label}
    </button>
  );
}

export function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
        checked
          ? 'border-black bg-black text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
          checked ? 'bg-white border-white' : 'border-gray-400'
        }`}
      >
        {checked && <span className="text-black text-xs font-bold">✓</span>}
      </span>
      <span className="capitalize">{label}</span>
    </label>
  );
}
