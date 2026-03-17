import axios from 'axios';
import globals from './globals';

class ImagesService {
  private static instance: ImagesService;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = globals.imagesUrl;
  }

  public static getInstance(): ImagesService {
    if (!ImagesService.instance) {
      ImagesService.instance = new ImagesService();
    }
    return ImagesService.instance;
  }

  // public async getImage(imgName : string): Promise<string> {
  public getImage(imgName : string):string {
    try {
      if (!imgName) throw new Error("imgName required");
      // const response = await axios.get<any[]>(this.baseUrl+imgName,{headers:{Authorization:"Bearer "+import.meta.env.VITE_CLIENT_TOKEN}});
      // return response.data?.data;
      return this.baseUrl+imgName;
    } catch (error) {
      console.error('Error fetching Imagess:', error);
      throw error;
    }
  }

}

export default ImagesService;