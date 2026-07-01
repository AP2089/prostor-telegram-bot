import { Bot, InlineKeyboard } from 'grammy';
import { getBoards, getBoardBySlug } from '../api.js';
import { HTML, boardCard } from '../helpers.js';
import type { Ctx } from '../types/common.js';

export function registerCatalog(bot: Bot<Ctx>) {
  bot.callbackQuery('catalog', async (ctx) => {
    await ctx.answerCallbackQuery();
    const boards = await getBoards();
    const kb = new InlineKeyboard();

    boards.forEach((b) => kb.text(`${b.name} — ${b.subtitle}`, `board:${b.slug}`).row());

    kb.text('← Назад', 'menu');

    await ctx.editMessageText('📋 <b>Каталог досок</b>\n\nВыберите модель:', {
      ...HTML,
      reply_markup: kb,
    });
  });

  bot.callbackQuery(/^board:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const board = await getBoardBySlug(ctx.match[1]);

    if (!board) return ctx.editMessageText('Товар не найден.');

    const kb = new InlineKeyboard();

    if (board.inStock) kb.text('🛒 В корзину', `add:${board.slug}`).row();

    kb.text('← К каталогу', 'catalog');
    await ctx.editMessageText(boardCard(board), { ...HTML, reply_markup: kb });
  });

  bot.callbackQuery(/^add:(.+)$/, async (ctx) => {
    const board = await getBoardBySlug(ctx.match[1]);

    if (!board) return ctx.answerCallbackQuery('Ошибка');

    const existing = ctx.session.cart.find((i) => i.boardId === board.id);

    if (existing) existing.quantity++;
    else
      ctx.session.cart.push({
        boardId: board.id,
        boardName: board.name,
        boardSubtitle: board.subtitle,
        price: board.price,
        quantity: 1,
      });

    await ctx.answerCallbackQuery('Добавлено в корзину ✅');
  });
}
