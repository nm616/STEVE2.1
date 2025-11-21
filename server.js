import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import compression from 'compression';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Content Security Policy middleware
app.use((req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // CSP directives
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' https://cdn.gpteng.co https://www.googletagmanager.com https://static.cloudflareinsights.com 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://yscpcikasejxqjyadszh.supabase.co https://flowise.elevate-hub.app https://www.google-analytics.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ];
  
  // Add development-specific permissions
  if (isDevelopment) {
    cspDirectives[3] = "connect-src 'self' https://yscpcikasejxqjyadszh.supabase.co https://flowise.elevate-hub.app https://www.google-analytics.com ws: wss:";
  }
  
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Enable compression
app.use(compression());

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
console.log('Current directory:', __dirname);
console.log('Files in current directory:', fs.readdirSync(__dirname));

if (!fs.existsSync(distPath)) {
  console.error('Error: dist directory does not exist!');
} else {
  console.log('dist directory exists, contents:', fs.readdirSync(distPath));
}

// Serve static files
app.use(express.static(distPath));

// For any request that doesn't match a static file, send the index.html
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Error: index.html not found in dist directory');
  }
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving files from: ${distPath}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});