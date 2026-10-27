const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  formatCategory,
  formatOrbsPrice,
} = require('../src/format-item-details');
const { MessageFlags } = require('discord.js');
const {
  createNoticeContainer,
  createResultsContainer,
  toComponentsV2Payload,
} = require('../src/result-container');
const priceListCommand = require('../src/commands/pricelist');

test('formats supported shop item categories', () => {
  assert.equal(formatCategory('avatar decorations'), 'Avatar decoration');
  assert.equal(formatCategory('profile effect'), 'Profile effect');
  assert.equal(formatCategory('FRAME EFFECTS'), 'Frame effect');
  assert.equal(formatCategory('nameplate'), 'Nameplate');
  assert.equal(formatCategory('other'), null);
});

test('shows valid Orbs prices and omits missing or invalid values', () => {
  assert.equal(formatOrbsPrice(1200), '1,200 Orbs');
  assert.equal(formatOrbsPrice(0), '0 Orbs');
  assert.equal(formatOrbsPrice(undefined), null);
  assert.equal(formatOrbsPrice(12.5), null);
  assert.equal(formatOrbsPrice(-1), null);
});

test('builds unaccented Components V2 containers with all shop result details', () => {
  const payload = toComponentsV2Payload(
    createResultsContainer('Shop results', [
      {
        name: 'Frame effect',
        description: 'A glowing border',
        type: 'Profile Frame',
        category: 'frame effect',
        giftPrice: 5.99,
        nitroPrice: 4.99,
        orbsPrice: 4100,
        price: 90,
        currency: 'PHP',
        loginPrice: 65,
        loginCurrency: 'PHP',
        url: 'https://example.com/item',
        imageUrl: 'https://example.com/item.jpg',
      },
    ]),
  );
  const container = payload.components[0].toJSON();
  const sections = container.components.filter((component) => component.type === 9);
  const text = sections
    .flatMap((section) => section.components)
    .filter((component) => component.type === 10)
    .map((component) => component.content)
    .join('\n');

  assert.equal(payload.flags, MessageFlags.IsComponentsV2);
  assert.equal(container.type, 17);
  assert.equal(container.accent_color, undefined);
  assert.match(text, /## Frame effect\nProfile Frame \| Frame effect/);
  assert.match(text, /## Purchase options/);
  assert.match(text, /\*\*Gift\*\* `\$5\.99 USD`/);
  assert.match(text, /\*\*Nitro\*\* `\$4\.99 USD`/);
  assert.match(text, /\*\*Orbs\*\* `4,100 Orbs` \*\(self only\)\*/);
  assert.match(text, /\*\*Shop price\*\* `₱90\.00`/);
  assert.match(text, /\*\*Login price\*\* `₱65\.00`/);
  assert.equal(sections[0].accessory.type, 11);
  assert.equal(sections[0].accessory.media.url, 'https://example.com/item.jpg');
  assert.equal(sections[1].accessory.type, 2);
  assert.equal(sections[1].accessory.label, 'View item');
  assert.equal(sections[1].accessory.url, 'https://example.com/item');
  assert.equal(container.components.some((component) => component.type === 10), false);

  const notice = toComponentsV2Payload(createNoticeContainer('No matches'));
  assert.equal(notice.components[0].toJSON().type, 17);
});

test('registers a private pricelist command with the provided PHP tiers', async () => {
  const command = priceListCommand.data.toJSON();
  assert.equal(command.name, 'pricelist');
  assert.equal(command.description, "View this server's private price tiers.");
  assert.equal(command.options.length, 0);

  let reply;
  await priceListCommand.execute({
    reply: async (payload) => {
      reply = payload;
    },
  });

  assert.equal(
    reply.flags,
    MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  );
  const container = reply.components[0].toJSON();
  assert.equal(container.type, 17);
  assert.equal(container.accent_color, undefined);
  const content = container.components[0].content;
  for (const tier of [
    '₱209 on Discord → ₱93 our price',
    '₱250 on Discord → ₱109 our price',
    '₱295 on Discord → ₱125 our price',
    '₱339 on Discord → ₱142 our price',
    '₱359 on Discord → ₱155 our price',
    '₱380 on Discord → ₱169 our price',
    '₱425 on Discord → ₱195 our price',
    '₱459 on Discord → ₱214 our price',
  ]) {
    assert.ok(content.includes(tier), `missing tier: ${tier}`);
  }
});