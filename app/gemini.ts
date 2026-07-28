import OpenAI from 'openai';
import {
  getBoards,
  getSettings,
  getFeatures,
  type Board,
  type ContactInfo,
  type ShopFeature,
} from './api.js';
import { fmt } from './helpers.js';

const gemini = new OpenAI({
  apiKey: process.env.API_GEMINI_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

function catalogText(boards: Board[]) {
  if (!boards.length) return 'Каталог пуст или недоступен.';

  return boards
    .map((b) => {
      const dims = `${b.dimensions.length}×${b.dimensions.width}×${b.dimensions.thickness}`;
      const price = b.oldPrice ? `${fmt(b.price)} (было ${fmt(b.oldPrice)})` : fmt(b.price);
      return [
        `• ${b.name} — ${b.subtitle}${b.categoryLabel ? ` [${b.categoryLabel}]` : ''}`,
        `  Цена: ${price} | ${b.inStock ? 'в наличии' : 'нет в наличии'}`,
        `  Размер: ${dims} | Вес: ${b.weight} кг | Объём: ${b.volume} л | До ${b.maxWeight} кг`,
        b.material ? `  Материал: ${b.material}` : '',
        `  ${b.tagline}`,
        b.description ? `  Описание: ${b.description}` : '',
        b.features.length ? `  Особенности: ${b.features.join('; ')}` : '',
        b.includes.length ? `  В комплекте: ${b.includes.join('; ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function contactsText(info: ContactInfo[], socials: string[]) {
  const lines = info.map((c) => `• ${c.label}: ${c.value} (${c.sub})`);
  if (socials.length) lines.push(`• Соцсети: ${socials.join(', ')}`);
  return lines.join('\n') || 'Контакты недоступны.';
}

function featuresText(features: ShopFeature[]) {
  if (!features.length) return 'Нет данных.';
  return features.map((f) => `• ${f.title}: ${f.description}`).join('\n');
}

async function shopContext() {
  const [boards, settings, features] = await Promise.all([
    getBoards().catch(() => [] as Board[]),
    getSettings().catch(() => ({ contactInfo: [] as ContactInfo[], socials: [] as string[] })),
    getFeatures().catch(() => [] as ShopFeature[]),
  ]);

  return [
    'Каталог товаров:',
    catalogText(boards),
    '',
    'Контакты и режим работы:',
    contactsText(settings.contactInfo ?? [], settings.socials ?? []),
    '',
    'Преимущества магазина:',
    featuresText(features),
    '',
    'Доставка и заказ:',
    '• Способы: курьер или самовывоз',
    '• Доставка курьером: 1 500 ₽',
    '• Бесплатная доставка при заказе от 30 000 ₽',
    '• Заказ можно оформить в боте (Корзина) или на сайте',
    '• Обратная связь: раздел Контакты в боте',
  ].join('\n');
}

export async function askAboutBoards(question: string) {
  const context = await shopContext();

  const res = await gemini.chat.completions.create({
    model: 'gemini-3.6-flash',
    messages: [
      {
        role: 'system',
        content: [
          'Ты помощник магазина Prostor (сап-борды / SUP).',
          'Отвечай на вопросы о магазине, товарах, ценах, доставке, гарантии и контактах.',
          'Если вопрос не связан с магазином или сап-бордами — вежливо откажи.',
          'Используй только данные ниже. Не выдумывай цены, модели и контакты.',
          'Отвечай кратко на русском. Markdown: **жирный**, *курсив*, списки через - .',
          '',
          context,
        ].join('\n'),
      },
      { role: 'user', content: question },
    ],
  });

  return res.choices[0]?.message?.content?.slice(0, 4000) ?? 'Нет ответа';
}
