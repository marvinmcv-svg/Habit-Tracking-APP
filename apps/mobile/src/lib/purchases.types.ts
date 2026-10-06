export interface Plan {
  id: string;
  kind: 'annual' | 'monthly' | 'lifetime';
  price: number;
  priceString: string;
  pricePerMonthString: string | null;
  currencyCode: string;
  /** Free-trial length when the store offers one. */
  trialDays: number | null;
}
