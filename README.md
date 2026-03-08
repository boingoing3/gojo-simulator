# ∞ Gojo Simulator

A Jujutsu Kaisen RPG chatbot powered by Claude AI. Play as Satoru Gojo or create your own OC with his powers.

## Running Locally

**Prerequisites:** [Node.js](https://nodejs.org/) (v18 or higher)

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Then open http://localhost:5173 in your browser.

## Deploying to GitHub Pages

1. Push this project to a GitHub repository
2. Go to your repo → **Settings** → **Pages**
3. Under "Build and deployment", set Source to **GitHub Actions**
4. The included workflow (`.github/workflows/deploy.yml`) will automatically build and deploy whenever you push to `main`
5. Your site will be live at `https://<your-username>.github.io/<repo-name>/`

## ⚠️ API Key Note

This app calls the Anthropic API directly from the browser. By default it relies on Claude's built-in access (works inside claude.ai artifacts). If you're running it standalone, you'll need to add your API key.

In `src/App.jsx`, find the fetch call and add your key to the headers:

```js
headers: {
  "Content-Type": "application/json",
  "x-api-key": "YOUR_API_KEY_HERE",
  "anthropic-version": "2023-06-01",
},
```

Get an API key at https://console.anthropic.com

> **Note:** Never commit your API key to a public GitHub repo. Use environment variables for production.
