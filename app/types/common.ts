import { Context, SessionFlavor } from 'grammy';
import type { CartItem } from '../api.js';

export type Step =
  | 'order:name'
  | 'order:email'
  | 'order:phone'
  | 'order:delivery'
  | 'order:address'
  | 'order:comment'
  | 'contact:name'
  | 'contact:email'
  | 'contact:phone'
  | 'contact:message'
  | null;

export interface SessionData {
  step: Step;
  cart: CartItem[];
  order: Partial<{
    name: string;
    email: string;
    phone: string;
    delivery: 'courier' | 'pickup';
    address: string;
    comment: string;
  }>;
  contact: Partial<{
    name: string;
    email: string;
    phone: string;
    message: string;
  }>;
}

export type Ctx = Context & SessionFlavor<SessionData>;
