const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const Banner = require('../models/Banner');
const sharp = require('sharp');
const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'public/banner');
const storage = multer.memoryStorage();
const upload = multer(require('../security/uploads.cjs').imageUploadOptions(storage));
const fs = require('fs');
//google
const { Readable } = require('stream');
const { google } = require('googleapis');
// Load the JSON key file
const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Create a new instance of the drive API
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Replace 'FOLDER_ID' with the ID of your target folder in Google Drive
const FOLDER_ID = '10jn65wQMomVYMAAy4TuH8iVgiFa8IhxJ';

router.post('/', upload.single('image'), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
  const { name, link } = req.body;
  const image = req.file;
  const croppedImage = await sharp(image.buffer, { limitInputPixels: 20000000 })
    .webp()
    .toBuffer();
  const resizedFilename = uuidv4() + '.webp';
  // save the resized image to the directory

  const banner = new Banner({ name, image: resizedFilename, link });

   // Upload the file to Google Drive
   try {
    const fileMetadata = {
      name: resizedFilename,
      parents: [FOLDER_ID], // Set the parent folder ID
    };

    const media = {
      mimeType: 'image/webp',
      body: Readable.from(croppedImage),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    banner.gdriveFileId = response.data.id; // Save the Google Drive file ID to the banner document

    // Save the banner document to the database
    await banner.save();

    res.status(201).json({ message: 'Banner created successfully' });
  } catch (error) {

    res.status(500).json({ error: 'Internal server error' });
  }
});
  // save the resized filename to the database

router.get('/', (req, res) => {
  const page = require('../security/admin-pagination.cjs').adminPagination(req.query);
  Banner.find({ archivedAt: { $exists: false } }).sort({ _id: -1 }).skip(page?.offset ?? 0).limit(page?.limit ?? 0)
    .then(banners => {
      res.status(200).json(banners);
    })
    .catch(error => {

      res.status(500).json({ error: 'Internal server error' });
    });
});

router.get('/images/:filename', async (req, res) => {
  const { filename } = req.params;

  try {
    // Retrieve the banner by filename from the database
    const banner = await Banner.findOne({ image: filename });
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    // Retrieve the image file from Google Drive
    const response = await drive.files.get(
      { fileId: banner.gdriveFileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Set the appropriate Content-Type header for the image
    res.set('Content-Type', 'image/webp');

    // Pipe the image stream from Google Drive to the response stream
    response.data.pipe(res);
  } catch (error) {

    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  res.json(await require('../commerce/dist/service.cjs').archiveEntity(db, 'banners', req.params.id, req.identity.id));
});

module.exports = router;
