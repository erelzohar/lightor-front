import { createContext, useContext } from 'react';
import type { ProductCard } from '../models/Product';

/**
 * LT-540: what a product's main button does: one answer for every layout, so
 * buying joins here when the site can take payment. Today it is an inquiry.
 */
export type ProductAction = 'inquire';

export const productAction = (_product: Pick<ProductCard, 'id'>): ProductAction => 'inquire';

/** The product the visitor is asking about, held for the contact form. */
export interface ProductInquiry {
  id: string;
  name: string;
}

export interface ProductInquiryState {
  inquiry: ProductInquiry | null;
  setInquiry: (inquiry: ProductInquiry | null) => void;
}

export const ProductInquiryContext = createContext<ProductInquiryState>({ inquiry: null, setInquiry: () => {} });

export const useProductInquiry = (): ProductInquiryState => useContext(ProductInquiryContext);
