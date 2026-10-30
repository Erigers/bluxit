# bluxit

A free personal finance tracker. No payments, no subscriptions. Templates hold accounts, accounts hold your money, and expenses deduct from the account you choose.

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL. The first account you create on a device is an **admin**; later accounts are normal users. All data is stored in the browser (`localStorage`) until you decide what should live on a server.

## What you can do

- Create **templates** and keep one active
- Add **accounts** with a name, color, currency, and optional opening balance
- Set **monthly income**, named or unnamed, plus **bonuses** on specific days
- Split inflow into accounts by **percentage** or a **static amount**
- Choose payday: first of the month, first Monday, or a specific date
- Add **expenses** with a type (autosuggest or create on the fly) and a price
- Color-code **expense types** and drop them into an account
- Paying from a different account than the type’s home creates a **local debt**
- Light, dark, or system theme

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview the production build
