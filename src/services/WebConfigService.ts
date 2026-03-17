import axios from 'axios';
import globals from './globals';
import { WebsiteConfig } from '../models/WebsiteConfig';

class WebConfigService {
  private static instance: WebConfigService;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = globals.webConfigsUrl;
  }

  public static getInstance(): WebConfigService {
    if (!WebConfigService.instance) {
      WebConfigService.instance = new WebConfigService();
    }
    return WebConfigService.instance;
  }

  public async getWebConfig(idOrSubDomain: string): Promise<WebsiteConfig> {
    try {
      const response = await axios.get<any>(`${this.baseUrl}/subdomain/${idOrSubDomain}`,{headers:{ Authorization: process.env.NODE_ENV !== "production" ? "Bearer " + import.meta.env.VITE_CLIENT_TOKEN : '' }});
      if (!response.data.success) throw Error ("Failed to get web config");
      return WebsiteConfig.fromJSON(response.data.data);
    } catch (error) {
      console.error(`Error fetching web config for subdomain ${idOrSubDomain}:`, error);
      throw error;
    }
  }
  public async getWebConfigByUserId(user_id: string): Promise<WebsiteConfig> {
    try {
      const response = await axios.get<any>(`${this.baseUrl}?user_id=${user_id}&limit=1`,{headers:{ Authorization: process.env.NODE_ENV !== "production" ? "Bearer " + import.meta.env.VITE_CLIENT_TOKEN : '' }});
      if (!response.data.success) throw Error ("Failed to get web config");
      return WebsiteConfig.fromJSON(response.data.data[0]);
    } catch (error) {
      console.error(`Error fetching web config for user ${user_id}:`, error);
      throw error;
    }
  }
}

export default WebConfigService;