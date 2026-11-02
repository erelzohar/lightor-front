import React from 'react';
import type { Product } from '../../models/Product';
import { Price, ProductActions, ProductPictures } from './ProductParts';

/**
 * LT-540: a site with one product: the home page is its page (from a 21st.dev
 * reference): the words on one side and the pictures on the other. The free
 * plan's one product lives here too.
 */
const ProductFeature: React.FC<{ product: Product; currency?: string; phone?: string; cta?: string }> = ({ product, currency, phone, cta }) => (
  <div className={`mx-auto grid max-w-6xl items-center gap-8 md:gap-14 ${product.images.length ? 'md:grid-cols-2' : ''}`} data-testid="products-feature">
    <div className="text-light-text dark:text-dark-text">
      {product.category && <p className="mb-2 text-sm font-medium uppercase tracking-wide text-light-text/70 dark:text-dark-text/70 break-words">{product.category}</p>}
      <h3 className="text-3xl font-bold leading-tight break-words md:text-4xl">{product.name}</h3>
      <Price product={product} currency={currency} className="mt-3 text-2xl font-bold" />
      {(product.description || product.summary) && (
        <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-light-text/85 dark:text-dark-text/85 break-words">{product.description || product.summary}</p>
      )}
      {product.details.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 ps-5 text-light-text/85 dark:text-dark-text/85">
          {product.details.map((detail) => <li key={detail} className="break-words">{detail}</li>)}
        </ul>
      )}
      <ProductActions product={product} phone={phone} label={cta} className="mt-6" />
    </div>
    <ProductPictures product={product} />
  </div>
);

export default ProductFeature;
