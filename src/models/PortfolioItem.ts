export class PortfolioItem {
  constructor(
    public url: string,
    public title: string,
    public description: string,
    /** LT-346: what the picture shows, for screen readers; written by the owner (an AI suggestion to start from). */
    public alt?: string
  ) {}

  static fromJSON(json: any): PortfolioItem {
    return new PortfolioItem(
      json.url,
      json.title,
      json.description,
      typeof json.alt === 'string' ? json.alt : undefined
    );
  }
}

/** The picture's text alternative: the owner's description, else its title, else none. */
export const altOf = (item: { alt?: string; title?: string } | undefined): string =>
  item?.alt?.trim() || item?.title?.trim() || '';
