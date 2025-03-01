const fetch = require('node-fetch');

// Replace 'YOUR_APP_URL' with the URL of your Express server (e.g., 'http://localhost:4000' during development).
const appUrl = 'https://almina-of4b.onrender.com';

// The interval at which the keep-alive requests will be sent (e.g., every 5 minutes).
const keepAliveInterval = 13 * 60 * 1000; // 5 minutes in milliseconds.

// Function to send a keep-alive request to your own server.
async function sendKeepAlive() {
  try {
    const response = await fetch(appUrl);
    console.log(`Keep-alive response: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('Keep-alive request failed:', error.message);
  }
}

// Send the first keep-alive request immediately when the server starts.
sendKeepAlive();

// Schedule subsequent keep-alive requests at the specified interval.
setInterval(sendKeepAlive, keepAliveInterval);
