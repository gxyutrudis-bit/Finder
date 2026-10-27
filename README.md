# Dolce-Finder

A Discord bot that searches a local catalog of shop items with `/find` and `/findimage`.

## Setup

1. Install Node.js 20.9 or newer, then run `npm install`.
2. Copy `.env.example` to `.env` and set `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`. Set `DISCORD_GUILD_ID` optionally to remove old guild-only commands from that server during deployment.
3. Add items, including an `imageUrl` for image search, to `data/shop-items.json`.
4. Run `npm run deploy` to register commands globally. Global commands can take some time to appear in Discord.
5. Run `npm start` to start the bot.

Use `/syncshop shop_json` with a `.json` attachment to replace the shared catalog. The attachment must be a non-empty JSON array using the item format below. Only members with Manage Server permission can sync the catalog. `/find` and `/findimage` read the updated catalog on every command.

## Balances

- `/addbalance amount` adds funds to the caller's balance. Only members with Manage Server permission can use it.
- `/viewbalance user` privately shows that member's balance.
- `/usebalance amount` privately deducts funds from your balance if sufficient funds are available.
- `/pricelist` privately shows the server's Discord-to-our-price tiers.

Balances are stored per server and user in `data/balances.json`. `BALANCE_CURRENCY` sets the single currency used for balances and defaults to `PHP`; set it to `EUR` for euros. Balance commands only maintain the balance ledger; they do not complete shop purchases or convert between currencies. Run `npm test` to test balance storage and spending.

The catalog is stored locally in `data/shop-items.json`; this project does not fetch Discord's live Shop catalog. `/find` searches names and descriptions. `/findimage` compares an uploaded image against catalog images and posts matching results publicly. Results show the item name, optional `type` and `category`, description, thumbnail, and available purchase options. Set `price` for the Shop price and optional ISO `currency` code (defaults to `USD`); `loginPrice` and optional `loginCurrency` add a Login price. `giftPrice` and `nitroPrice` add Gift and Nitro prices, with optional `giftCurrency` and `nitroCurrency` codes (both default to `USD`). Set an integer `orbsPrice` only when the item is available in the Orbs Shop; it is marked self-only. Set `category` to `avatar decoration`, `profile effect`, `frame effect`, or `nameplate` for a normalized category label. Add HTTPS `url` and `imageUrl` values to show the View item button and thumbnail; image search skips items without an `imageUrl`.

```json
[
	{
		"name": "Example item",
		"description": "A short description",
		"type": "Profile Frame",
		"category": "Frames",
		"giftPrice": 5.99,
		"giftCurrency": "USD",
		"nitroPrice": 4.99,
		"orbsPrice": 4100,
		"price": 4.99,
		"currency": "PHP",
		"loginPrice": 65,
		"loginCurrency": "PHP",
		"url": "https://example.com/item",
		"imageUrl": "https://example.com/item.jpg"
	},
	{
		"name": "Another example item",
		"price": 4.99,
		"category": "nameplate",
		"currency": "EUR",
		"url": "https://example.com/another-item",
		"imageUrl": "https://example.com/another-item.jpg"
	}
]
```