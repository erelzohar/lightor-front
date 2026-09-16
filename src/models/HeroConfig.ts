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
    public bordersType: HeroBordersType,
    /** LT-174: the round stamp decor's own line, written by the AI. Older configs have none. */
    public stamp?: string
  ) {}

  static fromJSON(json: any): HeroConfig {
    return new HeroConfig(
      json.visible,
      json.title,
      json.subtitle,
      json.description,
      json.heroImageSrc,
      json.bgType ?? 'gradient',
      json.bordersType ?? 'round',
      typeof json.stamp === 'string' && json.stamp.trim() ? json.stamp.trim() : undefined
    );
  }
}