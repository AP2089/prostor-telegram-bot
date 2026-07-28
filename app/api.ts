const BASE = process.env.API_URL;

const get = <T>(path: string): Promise<T> => fetch(`${BASE}${path}`).then((r) => r.json());

const post = (path: string, body: object) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());

export interface Board {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  tagline: string;
  category?: string;
  categoryLabel?: string;
  price: number;
  oldPrice?: number;
  inStock: boolean;
  dimensions: { length: string; width: string; thickness: string };
  volume: number;
  maxWeight: number;
  weight: number;
  material?: string;
  features: string[];
  description?: string;
  includes: string[];
}

export interface CartItem {
  boardId: number;
  boardName: string;
  boardSubtitle: string;
  price: number;
  quantity: number;
}

export interface ContactInfo {
  label: string;
  value: string;
  sub: string;
}

export interface ShopFeature {
  icon: string;
  title: string;
  description: string;
}

export const getBoards = () => get<Board[]>('/boards');

export const getBoardBySlug = (slug: string) =>
  get<Board[]>(`/boards?slug=${slug}`).then((bs) => bs[0] ?? null);

export const getSettings = () =>
  get<{ contactInfo: ContactInfo[]; socials: string[] }>('/settings');

export const getFeatures = () => get<ShopFeature[]>('/features');

export const createOrder = (order: object) => post('/orders', order);

export const createContact = (contact: object) => post('/contacts', contact);
