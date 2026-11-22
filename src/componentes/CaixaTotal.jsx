import { formatarMoeda } from '../formatadores.js';

// Caixa verde com o total somado e a quantidade de lançamentos ("quantidade" + singular/plural)
export default function CaixaTotal({ titulo, quantidade, singular, plural, total }) {
  return (
    <div className="bg-emerald-50 rounded-xl p-3 flex justify-between items-center my-3">
      <div>
        <span className="text-[10px] font-bold text-emerald-700 uppercase block">{titulo}</span>
        <span className="text-[11px] text-emerald-700">
          {quantidade} {quantidade === 1 ? singular : plural}
        </span>
      </div>
      <span className="text-lg font-extrabold text-emerald-800">R$ {formatarMoeda(total)}</span>
    </div>
  );
}
