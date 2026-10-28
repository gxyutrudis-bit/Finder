const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { replaceShopItems } = require('../catalog-store');

const MAX_CATALOG_BYTES = 8 * 1024 * 1024;
const MAX_SHOP_ITEMS = 10000;

const data = new SlashCommandBuilder()
  .setName('syncshop')
  .setDescription('Import every item from a shop.json file into the shared catalog.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addAttachmentOption((option) =>
    option
      .setName('shop_json')
      .setDescription('JSON array containing the shop items to import.')
      .setRequired(true),
  );

class CatalogValidationError extends Error {}

function normalizeShopItems(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CatalogValidationError('The JSON file must contain a non-empty array of shop items.');
  }
  if (value.length > MAX_SHOP_ITEMS) {
    throw new CatalogValidationError(`The catalog cannot contain more than ${MAX_SHOP_ITEMS} items.`);
  }

  return value.map((entry, index) => {
    if (!entry || Array.isArray(entry) || typeof entry !== 'object') {
      throw new CatalogValidationError(`Item ${index + 1} must be a JSON object.`);
    }

    if (typeof entry.name !== 'string' || entry.name.trim().length === 0) {
      throw new CatalogValidationError(`Item ${index + 1} needs a non-empty name.`);
    }

    const item = { name: entry.name.trim() };
    for (const field of ['description', 'type', 'category']) {
      if (entry[field] === undefined || entry[field] === null) continue;
      if (typeof entry[field] !== 'string') {
        throw new CatalogValidationError(`Item ${index + 1} has an invalid ${field}.`);
      }
      item[field] = entry[field];
    }

    for (const field of ['price', 'giftPrice', 'nitroPrice', 'loginPrice', 'loginPriceMax']) {
      if (entry[field] === undefined || entry[field] === null) continue;
      if (typeof entry[field] !== 'number' || !Number.isFinite(entry[field]) || entry[field] < 0) {
        throw new CatalogValidationError(`Item ${index + 1} has an invalid ${field}.`);
      }
      item[field] = entry[field];
    }
    if (
      item.loginPriceMax !== undefined &&
      (item.loginPrice === undefined || item.loginPriceMax < item.loginPrice)
    ) {
      throw new CatalogValidationError(`Item ${index + 1} has an invalid loginPriceMax.`);
    }

    for (const field of ['currency', 'giftCurrency', 'nitroCurrency', 'loginCurrency']) {
      if (entry[field] === undefined || entry[field] === null) continue;
      if (typeof entry[field] !== 'string' || !/^[A-Za-z]{3}$/.test(entry[field])) {
        throw new CatalogValidationError(`Item ${index + 1} has an invalid ${field}.`);
      }
      item[field] = entry[field].toUpperCase();
    }

    if (entry.orbsPrice !== undefined && entry.orbsPrice !== null) {
      if (!Number.isSafeInteger(entry.orbsPrice) || entry.orbsPrice < 0) {
        throw new CatalogValidationError(`Item ${index + 1} has an invalid Orbs price.`);
      }
      item.orbsPrice = entry.orbsPrice;
    }

    for (const field of ['url', 'imageUrl']) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') continue;
      if (typeof entry[field] !== 'string') {
        throw new CatalogValidationError(`Item ${index + 1} has an invalid ${field}.`);
      }
      let parsedUrl;
      try {
        parsedUrl = new URL(entry[field]);
      } catch {
        throw new CatalogValidationError(`Item ${index + 1} has an invalid ${field}.`);
      }
      if (parsedUrl.protocol !== 'https:') {
        throw new CatalogValidationError(`Item ${index + 1} ${field} must use HTTPS.`);
      }
      item[field] = parsedUrl.toString();
    }

    return item;
  });
}

async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: 'You need the Manage Server permission to sync the shop catalog.',
      ephemeral: true,
    });
    return;
  }

  const attachment = interaction.options.getAttachment('shop_json');
  if (
    !attachment?.name?.toLowerCase().endsWith('.json') ||
    attachment.size > MAX_CATALOG_BYTES
  ) {
    await interaction.reply({
      content: 'Attach a `.json` file smaller than 8 MB.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const response = await fetch(attachment.url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Could not download the attached JSON file.');

    const contents = Buffer.from(await response.arrayBuffer());
    if (contents.length > MAX_CATALOG_BYTES) {
      throw new CatalogValidationError('The JSON file must be smaller than 8 MB.');
    }

    let parsed;
    try {
      parsed = JSON.parse(contents.toString('utf8'));
    } catch {
      throw new CatalogValidationError('The attachment is not valid JSON.');
    }

    const items = normalizeShopItems(parsed);
    await replaceShopItems(items);
    await interaction.editReply(`Imported ${items.length} items into the shared shop catalog.`);
  } catch (error) {
    console.error('Shop catalog sync failed:', error);
    const message =
      error instanceof CatalogValidationError
        ? error.message
        : 'Could not sync the shop catalog. Check the file and try again.';
    await interaction.editReply(message);
  }
}

module.exports = {
  CatalogValidationError,
  data,
  execute,
  normalizeShopItems,
};