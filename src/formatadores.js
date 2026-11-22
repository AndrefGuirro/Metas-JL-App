// Formata um número como moeda brasileira, sem o símbolo (ex.: 1.234,50)
export const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
