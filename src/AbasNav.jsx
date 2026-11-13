import React, { useEffect, useRef, useState } from 'react';

/**
 * Barra de abas com rolagem lateral (pensada para o celular).
 * - Cada aba mantém o tamanho do texto e a barra rola para os lados.
 * - A aba ativa é centralizada automaticamente.
 * - Um degradê nas bordas avisa quando há mais abas escondidas.
 */
export default function AbasNav({ abas, ativa, onChange }) {
  const scrollRef = useRef(null);
  const [temEsquerda, setTemEsquerda] = useState(false);
  const [temDireita, setTemDireita] = useState(false);

  function atualizarIndicadores() {
    const el = scrollRef.current;
    if (!el) return;
    setTemEsquerda(el.scrollLeft > 4);
    setTemDireita(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    atualizarIndicadores();
    window.addEventListener('resize', atualizarIndicadores);
    return () => window.removeEventListener('resize', atualizarIndicadores);
  }, [abas.length]);

  // Mantém a aba ativa visível (centralizada) quando ela muda
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const botao = el.querySelector(`[data-aba="${ativa}"]`);
    if (botao) {
      const alvo = botao.offsetLeft - (el.clientWidth - botao.offsetWidth) / 2;
      el.scrollTo({ left: Math.max(0, alvo), behavior: 'smooth' });
    }
  }, [ativa]);

  return (
    <nav className="relative bg-white border-b border-slate-200" aria-label="Seções do aplicativo">
      <div
        ref={scrollRef}
        onScroll={atualizarIndicadores}
        className="flex flex-nowrap overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {abas.map(aba => (
          <button
            key={aba.id}
            type="button"
            data-aba={aba.id}
            onClick={() => onChange(aba.id)}
            aria-current={ativa === aba.id ? 'page' : undefined}
            className={`shrink-0 whitespace-nowrap px-4 py-3 text-sm font-semibold text-center border-b-2 ${
              ativa === aba.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {temEsquerda && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent" />
      )}
      {temDireita && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />
      )}
    </nav>
  );
}
