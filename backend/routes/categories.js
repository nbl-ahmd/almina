const Category = require('../models/Category');
const express = require('express');
const categoryRouter = express.Router();
const multer = require('multer');
const path = require('path');
const sharp= require('sharp')
const { v4: uuidv4 } = require('uuid');
// Generate a random color
//google
const { Readable } = require('stream');
const { google } = require('googleapis');
// Load the JSON key file
const keyFile = path.join(__dirname, '/cred.json');

const randomColor = () => {
  // Generate random RGB values between 0 and 255
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  // Return the RGB color string
  return `${r}, ${g}, ${b}`;
};




const color = randomColor();
// Create a new instance of the drive API
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Replace 'FOLDER_ID' with the ID of your target folder in Google Drive
const FOLDER_ID = '1EFfxTRU7EamU46cCl-NXrSnMz7H-Ivh4';


const storage = multer.memoryStorage();

  const upload = multer({ storage: storage });
const fs = require('fs');


categoryRouter.post('/', upload.single('image'), async (req, res) => {
  const { name } = req.body;
  const image = req.file;
  const color = randomColor();

  if (image) {
    try {
      const fileMetadata = {
        name: image.originalname,
        parents: [FOLDER_ID], // Set the parent folder ID
      };

      const media = {
        mimeType: 'application/octet-stream', // Set the media type as 'application/octet-stream'
        body: Readable.from(image.buffer),
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      const gdriveFileId = response.data.id; // Save the Google Drive file ID to the category document

      // Create a new category document with the Google Drive file ID
      const Filename = uuidv4() + '.webp';
      const category = new Category({
        name,
        color,
        gdriveFileId,
        image: Filename,
      });

      // Save the category document to the database
      await category.save();

      res.status(201).json({ message: 'category created successfully' });
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    try {
      // Create a new category document without an image
      const category = new Category({
        name,
        color,
      });

      // Save the category document to the database
      await category.save();

      res.status(201).json({ message: 'category created successfully' });
    } catch (error) {
      console.error('Error saving category:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});


categoryRouter.get('/', async (req, res) => {
  const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    const categoryList = await Category.find(filter).sort({ name: 1 });

    if (!categoryList) {
        res.status(500).json({ succes: false })
    }
    res.status(200).send(categoryList);
})

categoryRouter.get('/:id', async(req,res)=>{
    const category = await Category.findById(req.params.id);

    if(!category){
        res.status(500).json({message: 'The category with the given ID was not found.'})
    }
    res.status(200).send(category);
})



  categoryRouter.get('/images/:filename', async(req, res) => {
    const { filename } = req.params;
  
    try {
      // Retrieve the category by filename from the database
      const category = await Category.findOne({ image: filename });
      if (!category) {
        return res.status(404).json({ error: 'category not found' });
      }
  
      // Retrieve the image file from Google Drive
      const response = await drive.files.get(
        { fileId: category.gdriveFileId, alt: 'media' },
        { responseType: 'stream' }
      );
  
      // Set the appropriate Content-Type header for the image
      res.set('Content-Type', 'image/webp');
  
      // Pipe the image stream from Google Drive to the response stream
      response.data.pipe(res);
    } catch (error) {
      console.error('Error retrieving image from Google Drive:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });





categoryRouter.put('/disable/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  try {
    // Find the product by its ID
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ error: 'category not found' });
    }

    // Update the 'disabled' property of the product
    category.disabled = !category.disabled;

    // Save the updated product
    await category.save();
    console.log('success');

    res.json({ message: 'category updated successfully' });
  } catch (error) {
    console.error('Error while updating the category:', error);
    res.status(500).json({ error: 'Failed to update the category' });
  }
  });
categoryRouter.put('/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const updateFields = {};
  
    try {
      // Retrieve the previous image filename from the database
      const prevCategory = await Category.findById(id);
      const prevImage = prevCategory.image;
      const prevGdriveFileId = prevCategory.gdriveFileId;
  
      // Check if each field is present in the request body and update the corresponding field
      if (req.body.name) {
        updateFields.name = req.body.name;
      }
  
      if (req.body.color) {
        updateFields.color = req.body.color;
      }
  
      
  
      if (req.file) {
        const image = req.file;
   console.log('image is there')
       // Delete the previous image from Google Drive
       if (prevGdriveFileId && prevGdriveFileId !== '1cQnD6nDQ7Qge0LplEP22vuVTjtphlkoL') {
        await drive.files.delete({
          fileId: prevGdriveFileId,
        });
      }
  
  
        
  
        // Crop the image into a square
        const croppedImage = await sharp(image.buffer)
    .resize({ width: 500, height: 500, fit: 'cover' })
    .webp()
    .toBuffer();
  
        // Generate a new filename for the resized image
        const filename = uuidv4() + '.webp'; // 
  
         // Save the updated image to Google Drive
         const fileMetadata = {
          name: filename,
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
  
        updateFields.image = filename;
        updateFields.gdriveFileId = response.data.id; // Save the updated Google Drive file ID to the product document
      
      }
  
      const category = await Category.findByIdAndUpdate(id, updateFields, { new: true });
  
      if (!category) {
        return res.status(400).send('The category cannot be updated!');
      }
  
      res.send(category);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).send('An error occurred while updating the category');
    }
  });


categoryRouter.delete('/:id', async (req, res) => {
    const categoryId = req.params.id;
  
    try {
      // Find the category by ID
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'category not found!' });
      }
  
      // Delete the category from the database
      await Category.findByIdAndRemove(categoryId);
  
      // If applicable, delete the image file from Google Drive
      if (category.gdriveFileId && category.gdriveFileId !== '1cQnD6nDQ7Qge0LplEP22vuVTjtphlkoL') {
        await drive.files.delete({ fileId: category.gdriveFileId });
      }
  
      // Delete the image file from the server's file system
      fs.unlink(path.join(uploadDir, category.image), (error) => {
        if (error) {
          console.log('Error deleting image file:', error);
        }
      });
  
      return res.status(200).json({ success: true, message: 'The category and image are deleted!' });
    } catch (error) {
      console.error('Error deleting category:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  
module.exports = categoryRouter;