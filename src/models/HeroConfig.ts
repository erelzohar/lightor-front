export type HeroBgType = 'gradient' | 'clouds' | 'fog' | 'waves' | 'clouds2' | 'topology' | 'trunk' | 'birds' | 'net';
export type HeroBordersType = 'round' | 'square';

export class HeroConfig {
  constructor(
    public visible: boolean,
    public title: string,
    public subtitle: string,
    public description: string,
    public heroImageSrc: string,
    public bgType: HeroBgType,
    public bordersType: HeroBordersType
  ) {}

  static fromJSON(json: any): HeroConfig {
    return new HeroConfig(
      json.visible,
      json.title,
      json.subtitle,
      json.description,
      json.heroImageSrc,
      json.bgType ?? 'gradient',
      json.bordersType ?? 'round'
    );
  }
}