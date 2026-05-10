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

  public getImage(imgName: string): string {
    try {
      if (!imgName) throw new Error("imgName required");

      if (imgName.startsWith('http') ||
        imgName.startsWith('data:') ||
        imgName.startsWith('blob:')) {
        return imgName;
      }

      return this.baseUrl + imgName;

    } catch (error) {
      console.error('Error fetching Images:', error);
      throw error;
    }
  }

}

export default ImagesService;