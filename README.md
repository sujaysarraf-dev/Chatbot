<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

🌐 **Live Demo:** [https://chatbot5764.netlify.app/](https://chatbot5764.netlify.app/)

View your app in AI Studio: https://ai.studio/apps/drive/1KR9pwynyW7Oo-I34_rOGNSGJUQUXOoIr

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Netlify

1. **Push your code to GitHub** (already done)

2. **Connect to Netlify:**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub account and select this repository

3. **Configure Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - These are already configured in `netlify.toml`

4. **Set Environment Variables:**
   - In Netlify dashboard, go to Site settings → Environment variables
   - Add: `GEMINI_API_KEY` with your Gemini API key (get it from [Google AI Studio](https://aistudio.google.com/apikey))
   - ⚠️ **Important:** Never commit your API key to the repository!

5. **Deploy:**
   - Click "Deploy site"
   - Your app will be live at `https://your-site-name.netlify.app`

**Live Site:** [https://chatbot5764.netlify.app/](https://chatbot5764.netlify.app/)

**Note:** The `_redirects` file ensures proper SPA routing on Netlify.
