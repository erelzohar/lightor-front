import { PortfolioItem } from './PortfolioItem';

export class PortfolioConfig {
  constructor(
    public visible: boolean,
    public title: string,
    public description: string,
    public items: PortfolioItem[]
  ) {}

  static fromJSON(json: any): PortfolioConfig {
    return new PortfolioConfig(
      json.visible,
      json.title,
      json.description,
      json.items.map((item: any) => PortfolioItem.fromJSON(item))
    );
  }
}