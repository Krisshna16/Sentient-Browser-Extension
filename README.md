# Sentient Extension

**Your Loyal AI, powered by Dobby, in your browser.**

A powerful Chrome extension that brings AI assistance directly to your browser with a floating assistant and intelligent chat capabilities.

## Features

- **Floating AI Assistant**: Always accessible floating button with Dobby character
- **Smart Sidebar**: Expandable chat interface for detailed conversations
- **Quick Actions**: Instant page analysis, summarization, search, and data extraction
- **Secure Architecture**: Local server proxy protects API keys
- **Modern UI**: Clean, responsive design with smooth animations

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sentient-extension
   ```

2. **Set up the server**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Add your Fireworks AI API key to .env
   npm start
   ```

3. **Load the extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension folder

## Usage

- Click the floating Dobby button to open the sidebar
- Use quick action buttons for instant page analysis
- Chat naturally with the AI assistant
- Chat with Dobby about the current page content
- Dobby has access to page context (title, URL, content preview)
- Drag the floating button to reposition it

## Configuration

### Secure API Integration
The extension uses a **secure server-side proxy** architecture to protect API keys:

1. **Security Architecture**
   - ✅ No API keys stored in the extension
   - ✅ All API calls go through your secure backend
   - ✅ Extension only communicates with your server
   - ✅ Server handles Sentient AGI API authentication

2. **Setup Your Secure Backend**
   - Create a server endpoint (e.g., Node.js, Python, etc.)
   - Store your Sentient AGI API key on the server (environment variables)
   - Implement the proxy endpoint: `POST /api/dobby`
   - Update `serverEndpoint` in extension settings

3. **Example Backend Implementation**
   ```javascript
   // Example Node.js/Express endpoint
   app.post('/api/dobby', async (req, res) => {
     const { message, context } = req.body;
     
     // Validate request (check extension ID, rate limiting, etc.)
     if (!isValidExtensionRequest(req)) {
       return res.status(403).json({ error: 'Unauthorized' });
     }
     
     // Call Sentient AGI API with your server-side key
     // Store this in environment variables: SENTIENT_API_KEY=fw_3ZgMMm3qz8T7EDaW2ZDFBiuP
     const response = await fetch('https://api.sentient.ai/dobby/chat', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${process.env.SENTIENT_API_KEY}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ message, context })
     });
     
     const data = await response.json();
     res.json({ response: data.response });
   });
   ```

   **Environment Setup:**
   ```bash
   # In your server's .env file
   SENTIENT_API_KEY=fw_3ZgMMm3qz8T7EDaW2ZDFBiuP
   ```

## Project Structure

```
sentient-extension/
├── manifest.json              # Extension manifest (Manifest V3)
├── popup/                     # Popup interface
│   ├── popup.html            # Popup HTML structure
│   ├── popup.js              # Popup JavaScript logic
│   └── popup.css             # Popup styling (cyber theme)
├── background/               # Background service worker
│   └── background.js         # API calls and extension logic
├── content/                  # Content scripts
│   ├── content.js            # Floating button and sidebar
│   └── content.css           # Content script styling
├── assets/                   # Extension icons
│   ├── icon16.png            # 16x16 icon (placeholder)
│   ├── icon48.png            # 48x48 icon (placeholder)
│   └── icon128.png           # 128x128 icon (placeholder)
└── README.md                 # This file
```

## Development

### Key Components

1. **Manifest V3 Compliance**
   - Uses service worker instead of background pages
   - Proper permissions and host permissions
   - Content script injection on all URLs

2. **Popup Interface (`popup/`)**
   - Standalone chat interface
   - Chrome storage integration
   - Responsive design with cyber theme

3. **Background Service Worker (`background/background.js`)**
   - Handles API communication
   - Manages extension settings
   - Message passing between components

4. **Content Scripts (`content/`)**
   - Floating button injection
   - Sidebar chat interface
   - Page context extraction
   - Draggable UI elements

### Customization

#### Styling
- Modify `popup/popup.css` and `content/content.css` for theme changes
- Current theme uses cyber blue (#00d4ff) and dark gradients
- CSS custom properties can be added for easier theme switching

#### API Integration
- Update `background/background.js` `callDobbyAPI` function
- Add error handling and retry logic
- Implement API key management through extension options

#### Features
- Add settings page for API key configuration
- Implement context menu integration
- Add keyboard shortcuts
- Create options for sidebar positioning

## Security Notes

- **🔒 No API Keys in Extension**: All sensitive keys remain on your server
- **🛡️ Server-Side Proxy**: Extension only communicates with your backend
- **🔐 Request Validation**: Implement extension ID validation and rate limiting
- **📊 Audit Trail**: Server logs all API requests for monitoring
- **🏠 Local Data Only**: Chat history stored locally in browser
- **⚡ CSP Compliant**: Extension follows Content Security Policy best practices
- **🎯 Minimal Permissions**: Only required permissions for functionality

### Why This Architecture?
- **Prevents API Key Exposure**: Users can't extract your Sentient AGI API key
- **Rate Limiting Control**: Your server controls usage and prevents abuse
- **Cost Management**: You control API costs and usage patterns
- **User Authentication**: Implement your own user management if needed
- **Compliance**: Meet enterprise security requirements

## Troubleshooting

### Common Issues

1. **Extension Not Loading**
   - Ensure all files are in correct directory structure
   - Check Chrome developer console for errors
   - Verify manifest.json syntax

2. **Floating Button Not Appearing**
   - Check if content script is blocked by CSP
   - Verify the page allows extension injection
   - Look for JavaScript errors in page console

3. **API Errors**
   - Check network connectivity
   - Verify API key configuration
   - Review background script console logs

### Debug Mode
- Open Chrome DevTools
- Go to Extensions tab
- Click "Inspect views: service worker" for background script
- Use "Inspect" on popup for popup debugging

## Contributing

This is a starter project. Key areas for enhancement:

- Real API integration with Sentient AGI
- Settings/options page
- Enhanced context awareness
- Voice input/output
- Multi-language support
- Custom themes

## License

This starter project is provided as-is for development purposes.

---

**Note**: Replace placeholder API endpoints and add your actual Sentient AGI API key before production use.
