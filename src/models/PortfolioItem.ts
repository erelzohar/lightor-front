export class PortfolioItem {
  constructor(
    public url: string,
    public title: string,
    public description: string
  ) {}

  static fromJSON(json: any): PortfolioItem {
    return new PortfolioItem(
      json.url,
      json.title,
      json.description
    );
  }
}