export function FilterSettings() {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">
        Warunek filtru
      </label>
      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
        <option>Wartość {">"} 0</option>
        <option>Wartość {"<"} 0</option>
        <option>Usuń puste (Null)</option>
      </select>
    </div>
  );
}
