export class Social {
  constructor(
    public instagram: string | null,
    public facebook: string | null,
    public x: string | null,
    public tiktok: string | null
  ) {}

  static fromJSON(json: any): Social {
    return new Social(
      json.instagram || null,
      json.facebook || null,
      json.x || null,
      json.tiktok || null
    );
  }

  // Helper method to check if any social links are available
  hasAnySocialLinks(): boolean {
    return !!(this.instagram || this.facebook || this.x || this.tiktok);
  }

  // Helper method to get available social links as an array
  getAvailableSocialLinks(): string[] {
    return [
      this.instagram,
      this.facebook,
      this.x,
      this.tiktok
    ].filter((link): link is string => link !== null);
  }
}