1tE0R6sMYEy0cKvZ02b-rzlWvHlWdXY_W


const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const API_KEY = 'AIzaSyCAoeyr-tAvfLBcULu3uK_1yAtJ_YNjNv8'; // Replace with your own API key

// Create a new instance of the drive API
const drive = google.drive({ version: 'v3', auth: API_KEY });

/**
 * Uploads a file to Google Drive.
 *
 * @param {string} filePath - Path to the file to upload.
 * @param {string} fileName - Name of the file in Google Drive.
 * @param {string} mimeType - MIME type of the file.
 */
async function uploadFile(filePath, fileName, mimeType) {
  try {
    const fileContent = fs.readFileSync(filePath);

    const fileMetadata = {
      name: fileName
    };

    const media = {
      mimeType,
      body: fileContent
    };

    const res = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id'
    });

    console.log('File uploaded successfully. File ID:', res.data.id);
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

// Usage example
const filePath = 'path/to/file.txt'; // Replace with the path to your file
const fileName = 'uploaded_file.txt'; // Replace with the desired name in Google Drive
const mimeType = 'text/plain'; // Replace with the appropriate MIME type of the file

uploadFile(filePath, fileName, mimeType);
