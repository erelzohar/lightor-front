export class AboutFeature {
  constructor(
    public icon: string,
    public title: string,
    public description: string
  ) {}

  static fromJSON(json: any): AboutFeature {
    return new AboutFeature(
      json.icon,
      json.title,
      json.description
    );
  }
}

export class AboutParagraphs {
  constructor(
    public intro: string,
    public mission: string
  ) {}

  static fromJSON(json: any): AboutParagraphs {
    return new AboutParagraphs(
      json.intro,
      json.mission
    );
  }
}

export class AboutConfig {
  constructor(
    public visible: boolean,
    public title: string,
    public description: string,
    public paragraphs: AboutParagraphs,
    public features: AboutFeature[]
  ) {}

  static fromJSON(json: any): AboutConfig {
    return new AboutConfig(
      json.visible,
      json.title,
      json.description,
      AboutParagraphs.fromJSON(json.paragraphs),
      json.features.map((feature: any) => AboutFeature.fromJSON(feature))
    );
  }
}