import { Edit3, Trash2 } from 'lucide-react';
import { formatarMoeda } from '../formatadores.js';

// Lista de valores lançados; cada linha tem Editar (edição na própria linha) e Excluir
export default function ListaLancamentos({
  itens, textoVazio, idEmEdicao, valorEdicao, min,
  aoMudarValor, aoEditar, aoCancelar, aoSalvar, aoExcluir,
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
      {itens.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">{textoVazio}</p>
      )}
      {itens.map(item => (
        <div key={item.id} className="border border-slate-200 rounded-xl p-2.5">
          {idEmEdicao === item.id ? (
            <div className="space-y-2">
              <input
                type="number"
                step="0.01"
                min={min}
                inputMode="decimal"
                value={valorEdicao}
                onChange={e => aoMudarValor(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={aoCancelar}
                  className="flex-1 bg-slate-100 py-2.5 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => aoSalvar(item.id)}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-xs font-semibold"
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-emerald-700">R$ {formatarMoeda(item.valor)}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => aoEditar(item)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Edit3 size={14} /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => aoExcluir(item)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
