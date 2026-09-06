export const CATEGORY_NAMES: Record<string, string> = {
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  moradia: 'Moradia',
  saude: 'Saúde',
  lazer: 'Lazer',
  compras: 'Compras',
  contas: 'Contas',
  outros: 'Outros'
};

export function getCategoryName(category: string): string {
  return CATEGORY_NAMES[category] || category;
}
