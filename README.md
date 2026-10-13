# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
cp .env.example .env.local   # then paste your Anthropic API key into .env.local
npm run dev
```

Open the local URL Vite prints. AI features (session summary, Highlight notes,
Theme interpretation and the Theme review chat) call Claude through the Anthropic API using
`ANTHROPIC_API_KEY` from `.env.local`, which is git-ignored. Without a key the app still runs and the
Themes page falls back to offline drafts.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
