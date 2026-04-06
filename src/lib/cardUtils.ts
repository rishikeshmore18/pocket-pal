export const getCardPaymentObligation = (card: any): number => {
  if (!card.current_outstanding || Number(card.current_outstanding) === 0) return 0;
  if (card.minimum_payment_mode) return Number(card.minimum_payment || 0);
  if (card.is_zero_apr) {
    const targetBalance = Number(card.credit_limit) * (Number(card.target_utilization || 30) / 100);
    return Math.max(0, Number(card.current_outstanding) - targetBalance);
  }
  return Number(card.current_outstanding);
};

export const getCardPaymentLabel = (card: any): string => {
  if (card.minimum_payment_mode) return `${card.card_name} — Minimum Payment`;
  if (card.is_zero_apr) return `${card.card_name} — Strategy Payment`;
  return `${card.card_name} — Balance Due`;
};
