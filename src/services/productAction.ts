import { createContext, useContext } from 'react';
import type { ProductCard } from '../models/Product';

/**
 * LT-540: what a product's main button does: one answer for every layout, so
 * buying joins here when the site can take payment. Today it is an inquiry.
 */
export type ProductAction = 'inquire';

export const productAction = (_product: Pick<ProductCard, 'id'>): ProductAction => 'inquire';

/** LT-588: the colour and size a visitor picked. */
export interface ProductChoice {
  color?: string;
  size?: string;
}

/** The pick as words: "אדום, M". */
export const choiceText = (choice: ProductChoice | undefined): string =>
  [choice?.color, choice?.size].filter(Boolean).join(', ');

/** The product the visitor is asking about, held for the contact form. */
export interface ProductInquiry {
  id: string;
  name: string;
  choice?: ProductChoice;
}

/**
 * A pick made on a card, kept for the product's page it leads to (its form):
 * the page clears the inquiry when it opens, and takes this one up.
 */
const picks = new Map<string, ProductChoice>();
export const rememberChoice = (id: string, choice: ProductChoice | undefined): void => {
  if (choice && (choice.color || choice.size)) picks.set(id, choice);
  else picks.delete(id);
};
export const takeChoice = (id: string): ProductChoice | undefined => {
  const choice = picks.get(id);
  picks.delete(id);
  return choice;
};

export interface ProductInquiryState {
  inquiry: ProductInquiry | null;
  setInquiry: (inquiry: ProductInquiry | null) => void;
}

export const ProductInquiryContext = createContext<ProductInquiryState>({ inquiry: null, setInquiry: () => {} });

export const useProductInquiry = (): ProductInquiryState => useContext(ProductInquiryContext);
