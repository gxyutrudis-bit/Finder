const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} = require('discord.js');
const { formatPrice } = require('./format-price');
const { formatCategory, formatOrbsPrice } = require('./format-item-details');

function createNoticeContainer(message) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(message.slice(0, 4000)),
  );
}

function createResultsContainer(_title, items) {
  const container = new ContainerBuilder();

  items.slice(0, 5).forEach((item, index) => {
    if (index > 0) {
      container.addSeparatorComponents(new SeparatorBuilder());
    }

    const itemName = String(item.name ?? 'Shop item').slice(0, 256);
    const category = formatCategory(item.category) ?? item.category;
    const metadata = [item.type, category].filter(Boolean).join(' | ');
    const description = [
      `## ${itemName}`,
      metadata ? String(metadata).slice(0, 100) : null,
      item.description ? String(item.description).slice(0, 400) : null,
    ]
      .filter(Boolean)
      .join('\n');

    const itemSection = new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(description.slice(0, 1000)),
    );
    if (isHttpsUrl(item.imageUrl)) {
      itemSection.setThumbnailAccessory(
        new ThumbnailBuilder()
          .setURL(item.imageUrl)
          .setDescription(itemName.slice(0, 1024)),
      );
    }
    container.addSectionComponents(itemSection);
    container.addSeparatorComponents(new SeparatorBuilder());

    const purchaseOptions = ['## Purchase options'];
    if (isValidPrice(item.giftPrice)) {
      purchaseOptions.push(
        `**Gift** \`${formatPrice({ price: item.giftPrice, currency: item.giftCurrency ?? 'USD' })} ${item.giftCurrency ?? 'USD'}\``,
      );
    }
    if (isValidPrice(item.nitroPrice)) {
      purchaseOptions.push(
        `**Nitro** \`${formatPrice({ price: item.nitroPrice, currency: item.nitroCurrency ?? 'USD' })} ${item.nitroCurrency ?? 'USD'}\``,
      );
    }
    const orbsPrice = formatOrbsPrice(item.orbsPrice);
    if (orbsPrice) purchaseOptions.push(`**Orbs** \`${orbsPrice}\` *(self only)*`);
    if (isValidPrice(item.price)) {
      purchaseOptions.push(`**Shop price** \`${formatPrice(item)}\``);
    }
    if (isValidPrice(item.loginPrice)) {
      const loginPrice = formatPrice({
        price: item.loginPrice,
        currency: item.loginCurrency ?? item.currency ?? 'USD',
      });
      const loginPriceMax = isValidPrice(item.loginPriceMax)
        ? ` - ${formatPrice({
            price: item.loginPriceMax,
            currency: item.loginCurrency ?? item.currency ?? 'USD',
          })}`
        : '';
      purchaseOptions.push(
        `**Login price** \`${loginPrice}${loginPriceMax}\``,
      );
    }

    const purchaseSection = new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(purchaseOptions.join('\n').slice(0, 1000)),
    );
    if (isHttpsUrl(item.url)) {
      purchaseSection.setButtonAccessory(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('View item')
          .setURL(item.url),
      );
    }
    container.addSectionComponents(purchaseSection);
  });

  return container;
}

function toComponentsV2Payload(container) {
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function isHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidPrice(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

module.exports = {
  createNoticeContainer,
  createResultsContainer,
  toComponentsV2Payload,
};