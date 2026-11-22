// Janela flutuante padrão: fundo escuro, cartão branco, título, botão ✕ e botão "Fechar" no rodapé.
// "linhas" são textos extras logo abaixo do título; "camada" é a classe z-index (para ficar por cima de outras janelas).
export default function JanelaModal({ titulo, linhas, aoFechar, camada = 'z-50', children }) {
  return (
    <div className={`fixed inset-0 bg-black/50 ${camada} flex items-center justify-center p-3`}>
      <div className="bg-white w-full max-w-md rounded-2xl p-4 shadow-xl flex flex-col max-h-[90dvh]">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800 truncate">{titulo}</h3>
            {linhas}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="text-slate-400 p-2 -mr-2 -mt-1 text-sm"
          >
            ✕
          </button>
        </div>

        {children}

        <button
          type="button"
          onClick={aoFechar}
          className="w-full bg-slate-100 py-3 rounded-xl text-xs font-bold mt-3"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
