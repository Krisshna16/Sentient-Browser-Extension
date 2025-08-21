# Sentient Extension Server

Secure backend server for the Sentient AI Extension. Acts as a proxy between the extension and external APIs to protect API keys.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Add your Fireworks AI API key to the `.env` file:
   ```
   FIREWORKS_API_KEY=your_actual_api_key_here
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

## Security Features

- **API Key Protection**: API keys stored server-side, never exposed to users
- **CORS Protection**: Only allows requests from Chrome extensions and localhost
- **Rate Limiting**: Prevents abuse with request limits
- **Input Validation**: Validates all incoming requests
- **Error Handling**: Graceful error handling with fallback responses

## Endpoints

- `GET /health` - Health check
- `POST /api/dobby` - Main AI assistant endpoint
- `POST /api/analyze-page` - Page analysis endpoint
- `POST /api/search` - Web search endpoint
- `GET /api/settings` - Server configuration status

## How It Works

1. Extension (popup or floating button) sends request to background script
2. Background script forwards request to this server at `localhost:3000`
3. Server validates request and calls Fireworks AI API with protected API key
4. Server returns response to extension
5. If server unavailable, extension uses fallback responses

This architecture ensures API keys are never exposed to end users while providing a seamless experience.

## Author
Created by Krishna
