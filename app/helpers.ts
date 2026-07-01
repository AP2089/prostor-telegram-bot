import { InlineKeyboard } from 'grammy';
import type { Board, CartItem } from './api.js';

export const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';
export const HTML = { parse_mode: 'HTML' as const };

export const mainKb = () =>
  new InlineKeyboard()
    .text('📋 Каталог', 'catalog')
    .text('🛒 Корзина', 'cart')
    .row()
    .text('📞 Контакты', 'contacts');

export const backKb = () => new InlineKeyboard().text('← Главное меню', 'menu');

export const cancelKb = () => new InlineKeyboard().text('✕ Отмена', 'cancel');

export function boardCard(b: Board) {
  const price = b.oldPrice ? `${fmt(b.price)} <s>${fmt(b.oldPrice)}</s>` : fmt(b.price);

  return [
    `<b>${b.name} — ${b.subtitle}</b>`,
    `<i>${b.tagline}</i>`,
    '',
    `💰 ${price}   ${b.inStock ? '✅ В наличии' : '❌ Нет в наличии'}`,
    `📐 ${b.dimensions.length} × ${b.dimensions.width} × ${b.dimensions.thickness}`,
    `⚖️ ${b.weight} кг | 💧 ${b.volume} л | 👤 до ${b.maxWeight} кг`,
    '',
    b.features.map((f) => `• ${f}`).join('\n'),
  ].join('\n');
}

export function cartText(cart: CartItem[]) {
  if (!cart.length) return '🛒 Корзина пуста';

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const delivery = subtotal >= 30_000 ? 0 : 1_500;

  return [
    '🛒 <b>Ваша корзина:</b>',
    ...cart.map(
      (i) => `• ${i.boardName} ${i.boardSubtitle} ×${i.quantity} — ${fmt(i.price * i.quantity)}`,
    ),
    '',
    `Товары: ${fmt(subtotal)}`,
    `Доставка: ${delivery ? fmt(delivery) : 'бесплатно'}`,
    `<b>Итого: ${fmt(subtotal + delivery)}</b>`,
  ].join('\n');
}
