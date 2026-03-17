export class HeroConfig {
  constructor(
    public visible: boolean,
    public title: string,
    public subtitle: string,
    public description: string,
    public heroImageSrc: string
  ) {}

  static fromJSON(json: any): HeroConfig {    
    return new HeroConfig(
      json.visible,
      json.title,
      json.subtitle,
      json.description,
      json.heroImageSrc
    );
  }
}