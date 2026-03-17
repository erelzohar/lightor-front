import { PortfolioItem } from './PortfolioItem';

export class PortfolioConfig {
  constructor(
    public visible: boolean,
    public title: string,
    public description: string,
    public isGrid: boolean,
    public items: PortfolioItem[]
  ) {}

  static fromJSON(json: any): PortfolioConfig {
    return new PortfolioConfig(
      json.visible,
      json.title,
      json.description,
      json.isGrid,
      json.items.map((item: any) => PortfolioItem.fromJSON(item))
    );
  }
}