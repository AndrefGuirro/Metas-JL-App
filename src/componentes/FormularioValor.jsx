import { Plus } from 'lucide-react';

// Campo de valor + botão "Adicionar" (usado para novo pedido e novo valor de marca)
export default function FormularioValor({ aoEnviar, valor, aoMudar, placeholder, min, autoFocus, salvando }) {
  return (
    <form onSubmit={aoEnviar} className="flex gap-2 mb-3">
      <input
        type="number"
        step="0.01"
        min={min}
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={valor}
        onChange={e => aoMudar(e.target.value)}
        className="flex-1 min-w-0 border border-slate-300 rounded-lg p-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
      />
      <button
        type="submit"
        disabled={salvando}
        className="bg-blue-600 text-white px-3 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 disabled:opacity-50"
      >
        <Plus size={16} /> {salvando ? 'Salvando...' : 'Adicionar'}
      </button>
    </form>
  );
}
