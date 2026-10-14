import { safeHttpUrl } from '../utils/safeUrl';

export class Social {
  constructor(
    public instagram: string | null,
    public facebook: string | null,
    public x: string | null,
    public tiktok: string | null
  ) {}

  /**
   * Only http(s) links survive (LT-315): the server stores whatever string
   * the owner sends, and a `javascript:` link here ran on every visitor who
   * clicked the icon. A link that fails is dropped, so its icon never shows.
   */
  static fromJSON(json: any): Social {
    return new Social(
      safeHttpUrl(json?.instagram),
      safeHttpUrl(json?.facebook),
      safeHttpUrl(json?.x),
      safeHttpUrl(json?.tiktok)
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