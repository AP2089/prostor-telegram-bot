import { Bot, InlineKeyboard } from 'grammy';
import { getSettings, createContact } from '../api.js';
import { HTML, backKb, cancelKb } from '../helpers.js';
import {
  validateName,
  validateEmail,
  validatePhone,
  validateMessage,
  formatPhone,
} from '../validators.js';
import type { Ctx } from '../types/common.js';

export function registerContact(bot: Bot<Ctx>) {
  bot.callbackQuery('contacts', async (ctx) => {
    await ctx.answerCallbackQuery();
    const settings = await getSettings();
    const lines = settings.contactInfo.map((c) => `<b>${c.label}:</b> ${c.value}\n<i>${c.sub}</i>`);

    if (settings.socials?.length) lines.push(`\n<b>Соцсети:</b> ${settings.socials.join(', ')}`);

    const kb = new InlineKeyboard()
      .text('✉️ Написать нам', 'contact_form')
      .row()
      .text('← Назад', 'menu');

    await ctx.editMessageText(['📞 <b>Контакты</b>', '', ...lines].join('\n'), {
      ...HTML,
      reply_markup: kb,
    });
  });

  bot.callbackQuery('contact_form', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.step = 'contact:name';
    ctx.session.contact = {};
    await ctx.reply('✉️ <b>Обратная связь</b>\n\nШаг 1/4 — Введите ваше имя:', {
      ...HTML,
      reply_markup: cancelKb(),
    });
  });
}

export async function handleContactText(ctx: Ctx, text: string) {
  const { contact } = ctx.session;

  switch (ctx.session.step) {
    case 'contact:name': {
      const err = validateName(text);

      if (err) return ctx.reply(err);

      contact.name = text.trim();
      ctx.session.step = 'contact:email';

      return ctx.reply('Шаг 2/4 — Введите email:');
    }

    case 'contact:email': {
      const err = validateEmail(text);

      if (err) return ctx.reply(err);

      contact.email = text.trim();
      ctx.session.step = 'contact:phone';

      return ctx.reply('Шаг 3/4 — Введите номер телефона:');
    }

    case 'contact:phone': {
      const err = validatePhone(text);

      if (err) return ctx.reply(err);

      contact.phone = formatPhone(text)!;
      ctx.session.step = 'contact:message';

      return ctx.reply('Шаг 4/4 — Введите ваше сообщение:');
    }

    case 'contact:message': {
      const err = validateMessage(text);

      if (err) return ctx.reply(err);

      contact.message = text.trim();

      try {
        await createContact({
          ...contact,
          createdAt: new Date().toISOString(),
        });

        ctx.session.step = null;
        ctx.session.contact = {};

        await ctx.reply('✅ Сообщение отправлено! Мы свяжемся с вами в ближайшее время.', {
          reply_markup: backKb(),
        });
      } catch {
        ctx.session.step = null;

        await ctx.reply('Ошибка при отправке. Попробуйте позже.', {
          reply_markup: backKb(),
        });
      }
    }
  }
}
