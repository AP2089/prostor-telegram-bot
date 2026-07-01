import { Bot, InlineKeyboard } from 'grammy';
import { createOrder } from '../api.js';
import { fmt, HTML, backKb, cancelKb, cartText } from '../helpers.js';
import {
  validateName,
  validateEmail,
  validatePhone,
  validateAddress,
  formatPhone,
} from '../validators.js';
import type { Ctx } from '../types/common.js';

export function registerCart(bot: Bot<Ctx>) {
  bot.callbackQuery('cart', async (ctx) => {
    await ctx.answerCallbackQuery();
    const { cart } = ctx.session;
    const kb = new InlineKeyboard();

    if (cart.length)
      kb.text('✅ Оформить заказ', 'checkout').row().text('🗑 Очистить корзину', 'cart:clear').row();

    kb.text('← Назад', 'menu');

    try {
      await ctx.editMessageText(cartText(cart), { ...HTML, reply_markup: kb });
    } catch {
      /* содержимое не изменилось */
    }
  });

  bot.callbackQuery('cart:clear', async (ctx) => {
    await ctx.answerCallbackQuery('Корзина очищена');
    ctx.session.cart = [];
    await ctx.editMessageText('🗑 Корзина очищена', { reply_markup: backKb() });
  });

  bot.callbackQuery('checkout', async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!ctx.session.cart.length) return ctx.answerCallbackQuery('Корзина пуста');

    ctx.session.step = 'order:name';
    ctx.session.order = {};

    await ctx.reply('📝 <b>Оформление заказа</b>\n\nШаг 1/5 — Введите ваше имя:', {
      ...HTML,
      reply_markup: cancelKb(),
    });
  });

  bot.callbackQuery('order:courier', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.order.delivery = 'courier';
    ctx.session.step = 'order:address';
    await ctx.reply('Шаг 5/5 — Введите адрес доставки:');
  });

  bot.callbackQuery('order:pickup', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.order.delivery = 'pickup';
    ctx.session.step = 'order:comment';
    await ctx.reply('Комментарий к заказу (необязательно, или /skip):');
  });
}

export async function handleOrderText(ctx: Ctx, text: string) {
  const { order } = ctx.session;

  switch (ctx.session.step) {
    case 'order:name': {
      const err = validateName(text);

      if (err) return ctx.reply(err);

      order.name = text.trim();
      ctx.session.step = 'order:email';

      return ctx.reply('Шаг 2/5 — Введите email:');
    }

    case 'order:email': {
      const err = validateEmail(text);

      if (err) return ctx.reply(err);

      order.email = text.trim();
      ctx.session.step = 'order:phone';

      return ctx.reply('Шаг 3/5 — Введите номер телефона:');
    }

    case 'order:phone': {
      const err = validatePhone(text);

      if (err) return ctx.reply(err);

      order.phone = formatPhone(text)!;
      ctx.session.step = 'order:delivery';

      return ctx.reply('Шаг 4/5 — Выберите способ получения:', {
        reply_markup: new InlineKeyboard()
          .text('🚚 Курьер', 'order:courier')
          .text('🏪 Самовывоз', 'order:pickup'),
      });
    }

    case 'order:delivery':
      return ctx.reply('Пожалуйста, выберите способ получения из кнопок выше.');

    case 'order:address': {
      const err = validateAddress(text);

      if (err) return ctx.reply(err);

      order.address = text.trim();
      ctx.session.step = 'order:comment';

      return ctx.reply('Комментарий к заказу (необязательно, или /skip):');
    }

    case 'order:comment':
      order.comment = text.trim();
      await submitOrder(ctx);
  }
}

export async function submitOrder(ctx: Ctx) {
  const { cart, order } = ctx.session;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const delivery = order.delivery === 'courier' && subtotal < 30_000 ? 1_500 : 0;
  const total = subtotal + delivery;
  const orderNumber = 'PST-' + Date.now().toString().slice(-6);

  try {
    await createOrder({
      orderNumber,
      customer: {
        name: order.name,
        email: order.email,
        phone: order.phone,
        delivery: order.delivery,
        address: order.address ?? '',
        comment: order.comment ?? '',
      },
      items: cart.map((i) => ({
        boardId: i.boardId,
        boardName: i.boardName,
        boardSubtitle: i.boardSubtitle,
        quantity: i.quantity,
        price: i.price,
        total: i.price * i.quantity,
      })),
      total,
      createdAt: new Date().toISOString(),
    });

    ctx.session.cart = [];
    ctx.session.step = null;
    ctx.session.order = {};

    await ctx.reply(
      `✅ <b>Заказ оформлен!</b>\n\nНомер: <code>${orderNumber}</code>\nСумма: <b>${fmt(total)}</b>\n\nМы свяжемся с вами в ближайшее время.`,
      { ...HTML, reply_markup: backKb() },
    );
  } catch {
    ctx.session.step = null;
    await ctx.reply('Ошибка при оформлении заказа. Попробуйте позже.', {
      reply_markup: backKb(),
    });
  }
}
