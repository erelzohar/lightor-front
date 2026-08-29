export class FaqItem {
  constructor(
    public question: string,
    public answer: string
  ) {}

  static fromJSON(json: any): FaqItem {
    return new FaqItem(json.question, json.answer);
  }
}

/**
 * Optional section (LT-086): absent from a config = invisible, so every
 * existing site is unaffected.
 */
export class FaqConfig {
  constructor(
    public visible: boolean,
    public title: string,
    public items: FaqItem[]
  ) {}

  static fromJSON(json: any): FaqConfig {
    if (!json) return new FaqConfig(false, '', []);
    return new FaqConfig(
      !!json.visible,
      json.title ?? '',
      Array.isArray(json.items) ? json.items.map(FaqItem.fromJSON) : []
    );
  }
}
