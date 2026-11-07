import axios from 'axios';
import globals from './globals';
import { WebsiteConfig } from '../models/WebsiteConfig';
import { Product, ProductCard, parseProduct } from '../models/Product';
import { parsePost, parsePostCard, type Post, type PostCard } from '../models/Post';


class WebConfigService {
  private static instance: WebConfigService;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = globals.webConfigsUrl;
    axios.defaults.withCredentials = true;
  }

  public static getInstance(): WebConfigService {
    if (!WebConfigService.instance) {
      WebConfigService.instance = new WebConfigService();
    }
    return WebConfigService.instance;
  }

  public async getWebConfig(idOrSubDomain: string): Promise<WebsiteConfig> {
    try {
      const response = await axios.get<any>(`${this.baseUrl}/subdomain/${idOrSubDomain}`);
      if (!response.data.success) throw Error("Failed to get web config");
      return WebsiteConfig.fromJSON(response.data.data);
    } catch (error) {
      console.error(`Error fetching web config for subdomain ${idOrSubDomain}:`, error);
      throw error;
    }
  }

  /** LT-540: every product the site shows, for its `/products`. */
  public async getProducts(subDomain: string): Promise<ProductCard[]> {
    const response = await axios.get<any>(`${this.baseUrl}/subdomain/${subDomain}/products`);
    return (response.data.data as unknown[]).map(parseProduct).filter((p): p is Product => !!p);
  }

  /** LT-540: one product and a few to show beside it. Null when it is no product of the site. */
  public async getProduct(subDomain: string, slug: string): Promise<{ product: Product; related: Product[] } | null> {
    try {
      const response = await axios.get<any>(`${this.baseUrl}/subdomain/${subDomain}/products/${encodeURIComponent(slug)}`);
      const product = parseProduct(response.data.data?.product);
      if (!product) return null;
      const related = (response.data.data?.related ?? []).map(parseProduct).filter((p: Product | null): p is Product => !!p);
      return { product, related };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  }

  /** LT-610: the blog's posts, newest first. */
  public async getPosts(subDomain: string): Promise<PostCard[]> {
    const response = await axios.get<any>(`${this.baseUrl}/subdomain/${subDomain}/posts`);
    return (response.data.data as unknown[]).map(parsePostCard).filter((p): p is PostCard => !!p);
  }

  /** LT-610: one post and the newest others. Null when it is no post of the site. */
  public async getPost(subDomain: string, slug: string): Promise<{ post: Post; more: PostCard[] } | null> {
    try {
      const response = await axios.get<any>(`${this.baseUrl}/subdomain/${subDomain}/posts/${encodeURIComponent(slug)}`);
      const post = parsePost(response.data.data?.post);
      if (!post) return null;
      const more = (response.data.data?.more ?? []).map(parsePostCard).filter((p: PostCard | null): p is PostCard => !!p);
      return { post, more };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  }

  public async getWebConfigByUserId(user_id: string): Promise<WebsiteConfig> {
    try {
      const response = await axios.get<any>(`${this.baseUrl}?user_id=${user_id}&limit=1`);
      if (!response.data.success) throw Error("Failed to get web config");
      return WebsiteConfig.fromJSON(response.data.data[0]);
    } catch (error) {
      console.error(`Error fetching web config for user ${user_id}:`, error);
      throw error;
    }
  }
}

export default WebConfigService;