const NOMES_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

// Retorna o mês de referência no formato "AAAA-MM" (ex.: "2026-11"),
// usando a data/hora local do aparelho.
export function getMesRef(data = new Date()) {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${data.getFullYear()}-${mes}`;
}

// Converte "2026-11" em "novembro de 2026".
export function formatarMesRef(mesRef) {
  const [ano, mes] = mesRef.split('-');
  return `${NOMES_MESES[Number(mes) - 1]} de ${ano}`;
}
