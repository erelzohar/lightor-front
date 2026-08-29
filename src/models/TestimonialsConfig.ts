export class TestimonialItem {
  constructor(
    public name: string,
    public text: string
  ) {}

  static fromJSON(json: any): TestimonialItem {
    return new TestimonialItem(json.name, json.text);
  }
}

/**
 * Optional section (LT-086): absent from a config = invisible, so every
 * existing site is unaffected. The AI wizard generates this as a HIDDEN
 * scaffold — fabricated named reviews must never ship live; the owner
 * fills real quotes and enables it (via the AI edit chat until the
 * dashboard editor lands).
 */
export class TestimonialsConfig {
  constructor(
    public visible: boolean,
    public title: string,
    public items: TestimonialItem[]
  ) {}

  static fromJSON(json: any): TestimonialsConfig {
    if (!json) return new TestimonialsConfig(false, '', []);
    return new TestimonialsConfig(
      !!json.visible,
      json.title ?? '',
      Array.isArray(json.items) ? json.items.map(TestimonialItem.fromJSON) : []
    );
  }
}
