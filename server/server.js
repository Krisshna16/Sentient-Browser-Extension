const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

const requestLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(requestLimiter);

app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            /^chrome-extension:\/\//,
            /^http:\/\/localhost(:\d+)?$/,
            /^https:\/\/localhost(:\d+)?$/
        ];
        
        if (!origin || allowedOrigins.some(pattern => pattern.test(origin))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Extension-ID', 'X-Extension-Version']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global error handler for body parsing
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
    next(error);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Sentient Extension Server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Main Dobby API endpoint - single endpoint for both popup and floating button
app.post('/api/dobby', async (req, res) => {
    try {

        const { message, context, timestamp } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                error: 'Valid message is required',
                success: false 
            });
        }

        if (message.length > 10000) {
            return res.status(400).json({ 
                error: 'Message too long (max 10000 characters)',
                success: false 
            });
        }

        const sanitizedMessage = message.replace(/<script[^>]*>.*?<\/script>/gi, '')
                                        .replace(/<[^>]*>/g, '')
                                        .trim();

        const extensionId = req.headers['x-extension-id'];
        if (!extensionId) {
            return res.status(401).json({ 
                error: 'Extension ID required',
                success: false 
            });
        }

        if (!/^[a-z]{32}$/.test(extensionId)) {
            return res.status(401).json({ 
                error: 'Invalid extension ID format',
                success: false 
            });
        }

        const whitelist = process.env.EXTENSION_ID_WHITELIST;
        if (whitelist && whitelist !== 'your_extension_id_here') {
            const allowedIds = whitelist.split(',').map(id => id.trim());
            if (!allowedIds.includes(extensionId)) {
                return res.status(403).json({ 
                    error: 'Extension not authorized',
                    success: false 
                });
            }
        }

        if (context !== 'popup' && context !== 'floating_button' && context !== 'content_script') {
            return res.status(400).json({ 
                error: 'Invalid request context',
                success: false 
            });
        }

        const response = await callFireworksAI(sanitizedMessage, context);

        res.json({
            success: true,
            response: response,
            timestamp: new Date().toISOString(),
            context: context || 'extension'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Sorry, I encountered an error processing your request.'
        });
    }
});

// Protected Fireworks AI API call
async function callFireworksAI(message, context = 'extension') {
    try {
        const apiKey = process.env.FIREWORKS_API_KEY;
        
        if (!apiKey || apiKey === 'your_fireworks_api_key_here') {
            return getFallbackResponse(message, context);
        }

        const response = await fetch(process.env.FIREWORKS_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sentientfoundation/dobby-unhinged-llama-3-3-70b-new',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Dobby, a helpful AI assistant integrated into a browser extension. You help users with web-related tasks, answer questions, and provide assistance. Be concise, helpful, and friendly.'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 500,
                temperature: 0.7,
                top_p: 0.9
            })
        });

        if (!response.ok) {
            throw new Error(`Fireworks API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a proper response.';

    } catch (error) {
        return getFallbackResponse(message, context);
    }
}

// Fallback responses when API is unavailable
function getFallbackResponse(message, context) {
    const responses = [
        `Hello! I'm Dobby, your AI assistant. I'm currently running in offline mode. You asked: "${message.substring(0, 50)}..." - I'd be happy to help once the API connection is restored.`,
        "I'm here to assist you! While my full AI capabilities aren't available right now, I'm still ready to help in any way I can.",
        "Hi there! I notice I'm running in limited mode. For full AI responses, please make sure the API key is properly configured.",
        "Greetings! I'm your browser extension AI assistant. I'm currently using fallback responses, but I'm still here to help!",
        "Hello! I'm Dobby, ready to assist you. I'm operating in offline mode right now, but I'm still functional for basic interactions."
    ];

    // Add context-specific responses
    if (context === 'content_script') {
        responses.push("I see you're using the floating Ask Dobby button! I'm here to help with anything on this page.");
    } else if (context === 'extension') {
        responses.push("Thanks for using the Sentient AI Extension! I'm here to help with your browsing needs.");
    }

    return responses[Math.floor(Math.random() * responses.length)];
}

// Settings endpoint
app.get('/api/settings', (req, res) => {
    res.json({
        success: true,
        settings: {
            serverStatus: 'running',
            apiConfigured: !!process.env.FIREWORKS_API_KEY && process.env.FIREWORKS_API_KEY !== 'your_fireworks_api_key_here',
            version: '1.0.0'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Something went wrong on the server.'
    });
});

// Add missing endpoints for popup functionality
app.post('/api/analyze-page', async (req, res) => {
    try {
        const { url, action, content } = req.body;
        
        if (!url || !action) {
            return res.status(400).json({ 
                error: 'URL and action are required',
                success: false 
            });
        }

        const sanitizedUrl = url.replace(/<[^>]*>/g, '').trim();
        const sanitizedAction = action.replace(/<[^>]*>/g, '').trim();
        
        let pageData = {};
        try {
            if (content && content.startsWith('{')) {
                pageData = JSON.parse(content);
            }
        } catch (e) {
            // If not JSON, treat as plain text
            pageData = { content: content };
        }
        
        let prompt = '';
        const pageInfo = `
Title: ${pageData.title || 'Unknown'}
URL: ${sanitizedUrl}
Description: ${pageData.metaDescription || 'Not available'}
Headings: ${pageData.headings ? pageData.headings.join(', ') : 'None found'}
Content Preview: ${pageData.paragraphs ? pageData.paragraphs.slice(0, 2).join(' ') : 'No content extracted'}
`;
        
        switch (sanitizedAction) {
            case 'analyze':
                prompt = `Analyze this webpage in detail:\n${pageInfo}\n\nProvide comprehensive insights about its purpose, content structure, target audience, and key information. Be thorough and analytical.`;
                break;
            case 'summarize':
                prompt = `Summarize this webpage:\n${pageInfo}\n\nExtract and present the main points, key information, and essential takeaways in a clear, organized format.`;
                break;
            case 'extract-data':
                prompt = `Extract structured data from this webpage:\n${pageInfo}\n\nIdentify and organize important data points, facts, numbers, dates, contact information, and other structured elements.`;
                break;
            default:
                prompt = `Help me understand this webpage:\n${pageInfo}\n\nWhat is it about and what are the main points I should know?`;
        }
        
        const aiResponse = await callFireworksAI(prompt);
        
        res.json({ 
            success: true, 
            analysis: aiResponse 
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: 'Analysis failed',
            success: false 
        });
    }
});

app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ 
                error: 'Search query is required',
                success: false 
            });
        }

        const sanitizedQuery = query.replace(/<[^>]*>/g, '').trim();
        
        if (sanitizedQuery.length === 0) {
            return res.status(400).json({ 
                error: 'Valid search query is required',
                success: false 
            });
        }
        
        const searchPrompt = `Please provide comprehensive search results and information about: "${sanitizedQuery}". Include relevant facts, explanations, and helpful details about this topic. Format your response as if you're providing search results with key information.`;
        
        const aiResponse = await callFireworksAI(searchPrompt);
        
        res.json({ 
            success: true, 
            result: aiResponse 
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: 'Search failed',
            success: false 
        });
    }
});

app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: 'The requested endpoint does not exist.'
    });
});

app.listen(PORT, () => {
});

process.on('SIGINT', () => {
    process.exit(0);
});

module.exports = app;
