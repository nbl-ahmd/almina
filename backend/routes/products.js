const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const sharp = require('sharp');
const ExifImage = require('exif').ExifImage;
const Product = require('../models/Product');
const Category = require('../models/Category');
const productRouter = express.Router();
const uploadDir = path.join(__dirname, '..', 'public/products');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const fs = require('fs');

//google
const { Readable } = require('stream');
const { google } = require('googleapis');
// Load the JSON key file
const keyFile = path.join(__dirname, '/cred.json');

// Create a new instance of the drive API
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Replace 'FOLDER_ID' with the ID of your target folder in Google Drive
const FOLDER_ID = '1I8HpwJ_iaOx_r7ZsOOETYcQbpMFpLUH6';

// Function to generate a unique product ID
async function generateProductID() {
  try {
    const existingProducts = await Product.find();
    let maxID = 0;
    for (const product of existingProducts) {
      const productID = parseInt(product.product_id.substring(2));
      if (productID > maxID) {
        maxID = productID;
      }
    }
    return `PD${String(maxID + 1).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating product ID:', error);
    throw error;
  }
}


// productRouter.post('/', upload.single('image'), async (req, res) => {
//   const category = await Category.findById(req.body.category);
//   const {
//     name,
//     price,
//     stock,
//     barcode,
//     description
//   } = req.body;
//   const vat = req.body.vat == 'true';
//   const sale = req.body.sale == 'true';
//   const featured = req.body.featured == 'true';
//   const image = req.file;
//   const product_id = await generateProductID();
//   let orientation = 1;
//   if (image) {
//     try {
//       const exifData = await sharp(image.buffer).metadata();
//       orientation = exifData.orientation || 1;
//     } catch (error) {
//       console.error('Error reading EXIF data:', error);
//     }

//     // crop the image into a square
//     const croppedImage = await sharp(image.buffer)
//       .resize({ width: 500, height: 500, fit: 'cover' })
//       .rotate()
//       .webp()
//       .toBuffer();

//     // generate a new filename for the resized image
//     const Filename = uuidv4() + '.webp';

//     const product = new Product({
//       product_id,
//       name,
//       image: Filename,
//       category,
//       featured,
//       price,
//       vat,
//       stock,
//       sale,
//       barcode,
//       description
//     }); // save the resized filename to the database

//     try {
//       const fileMetadata = {
//         name: Filename,
//         parents: [FOLDER_ID], // Set the parent folder ID
//       };

//       const media = {
//         mimeType: 'image/webp',
//         body: Readable.from(croppedImage),
//       };

//       const response = await drive.files.create({
//         resource: fileMetadata,
//         media: media,
//         fields: 'id',
//       });

//       product.gdriveFileId = response.data.id; // Save the Google Drive file ID to the product document

//       // Save the product document to the database
//       await product.save();

//       res.status(201).json({ message: 'product created successfully' });
//     } catch (error) {
//       console.error('Error uploading file to Google Drive:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   } else {
//     const product = new Product({
//       product_id,
//       name,
//       category,
//       featured,
//       price,
//       vat,
//       stock,
//       sale,
//       barcode,
//       description
//     });

//     try {
//       // Save the product document to the database without an image
//       await product.save();

//       res.status(201).json({ message: 'product created successfully' });
//     } catch (error) {
//       console.error('Error saving product:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   }
// });


// productRouter.get('/', (req, res) => {
//     Product.find().populate('category')
//         .then(products => {
//             res.status(200).json(products);
//         })
//         .catch(error => {
//             console.log(error);
//             res.status(500).json({ error: 'Internal server error' });
//         });
// });

// productRouter.get('/', (req, res) => {
//   const filter = req.query.filter ? JSON.parse(req.query.filter) : {}; // Parse the filter JSON string if provided
//   const limit = Number(req.query.limit) || 10; // Default limit is 10 if not provided
//   const offset = Number(req.query.offset) || 0; // Default offset is 0 if not provided

//   Product.find(filter)
//     .skip(offset)
//     .limit(limit)
//     .populate('category')
//     .then(products => {
//       res.status(200).json(products);
//     })
//     .catch(error => {
//       console.log(error);
//       res.status(500).json({ error: 'Internal server error' });
//     });
// });



productRouter.post('/', upload.array('images', 5), async (req, res) => {
  const category = await Category.findById(req.body.category);
  const { name, price, stock, barcode, description } = req.body;
  const vat = req.body.vat === 'true';
  const sale = req.body.sale === 'true';
  const featured = req.body.featured === 'true';
  const product_id = await generateProductID();
  const files = req.files;

  let imageUrls = [];
  let gdriveFileIds = [];

  if (files && files.length > 0) {
      for (const file of files) {
          try {
            console.log('got inside ', file)
              // Resize and convert the image
              const croppedImage = await sharp(file.buffer)
                  .resize({ width: 500, height: 500, fit: 'cover' })
                  .webp()
                  .toBuffer();

              // Generate a filename
              const filename = uuidv4() + '.webp';

              // Save to Google Drive
              const fileMetadata = {
                  name: filename,
                  parents: [FOLDER_ID],
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

              console.log('hereee final response',response.data)

              // Store URLs and Google Drive IDs
              imageUrls.push(filename);
              gdriveFileIds.push(response.data.id);
          } catch (error) {
              console.error('Error processing image:', error);
              return res.status(500).json({ error: 'Failed to upload images' });
          }
      }
  }

  const product = new Product({
      product_id,
      name,
      images: imageUrls, // Save array of image URLs
      gdriveFileIds, // Save array of Google Drive file IDs
      category,
      featured,
      price,
      vat,
      stock,
      sale,
      barcode,
      description,
  });

  try {
      await product.save();
      res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
      console.error('Error saving product:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});



productRouter.get('/images/:filename', async (req, res) => {
  const { filename } = req.params;

  try {
    // Retrieve the product by filename
    const product = await Product.findOne({
      $or: [{ image: filename }, { images: filename }],
    });

    if (!product) {
      return res.status(404).json({ error: 'Product or image not found' });
    }

    if (product.gdriveFileId) {
      // For old products with a single gdriveFileId
      const response = await drive.files.get(
        { fileId: product.gdriveFileId, alt: 'media' },
        { responseType: 'stream' }
      );

      // Set the appropriate Content-Type header for the image
      res.set('Content-Type', 'image/webp');

      // Pipe the image stream from Google Drive to the response stream
      response.data.pipe(res);
    } else if (product.gdriveFileIds) {
      // For new products with multiple gdriveFileIds
      console.log('Google Drive File IDs:', product.gdriveFileIds);

      // Find the index of the requested filename in the `images` array
      const imageIndex = product.images.indexOf(filename);
      if (imageIndex === -1 || !product.gdriveFileIds[imageIndex]) {
        return res.status(404).json({ error: 'Image not found in product' });
      }

      const gdriveFileId = product.gdriveFileIds[imageIndex];
      const response = await drive.files.get(
        { fileId: gdriveFileId, alt: 'media' },
        { responseType: 'stream' }
      );

      // Set the appropriate Content-Type header for the image
      res.set('Content-Type', 'image/webp');

      // Pipe the image stream from Google Drive to the response stream
      response.data.pipe(res);
    } else {
      return res.status(404).json({ error: 'No valid Google Drive file ID found' });
    }
  } catch (error) {
    console.error('Error retrieving image from Google Drive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// productRouter.get('/images/:filename', async(req, res) => {
//   const { filename } = req.params;


//   try {
//     // Retrieve the product by filename from the database
//     const product = await Product.findOne({ image: filename });
//     if (!product) {
//       return res.status(404).json({ error: 'product not found' });
//     }

//     console.log('inside img fetchh', product)



//     // Retrieve the image file from Google Drive
//     const response = await drive.files.get(
//       { fileId: product.gdriveFileId, alt: 'media' },
//       { responseType: 'stream' }
//     );

//     // Set the appropriate Content-Type header for the image
//     res.set('Content-Type', 'image/webp');

//     // Pipe the image stream from Google Drive to the response stream
//     response.data.pipe(res);
//   } catch (error) {
//     console.error('Error retrieving image from Google Drive:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });



productRouter.get('/', async (req, res) => {
  const filter = req.query.filter ? JSON.parse(req.query.filter) : {}; // Parse the filter JSON string if provided
  const limit = Number(req.query.limit); // Remove default limit
  const offset = Number(req.query.offset) || 0; // Default offset is 0 if not provided
  const disabledCategory = (req.query.disabledCat);
  try {
    let products;

 if (limit) {
      // Fetch products with pagination

      let sortQuery = {}; // Define an empty object to store the sorting query

      if (filter.sale === true) {
        // If sale is true, sort by createdAt in descending order
        sortQuery = { createdAt: -1, _id: 1 };
      } else {
        // Otherwise, sort by stock in descending order
        sortQuery = { stock: -1, _id: 1 };
      }

      products = await Product.find(filter)
      .sort(sortQuery)
        .skip(offset)
        .limit(limit)
        .populate('category');
    } else {
      // Fetch all products without pagination
      products = await Product.find(filter).populate('category');
    }

console.log(disabledCategory);
    if(disabledCategory === 'false'){
      // Filter products where category.disabled is false
const filteredProducts = products.filter((product) => {
  // If a product has a category and category.disabled is false, include it
  if (product.category && product.category.disabled === false) {
    return true;
  }
  return false;
});
res.status(200).json(filteredProducts);
    
    }
    else if(disabledCategory === 'true'){
      // Filter products where category.disabled is false
const filteredProducts = products.filter((product) => {
  // If a product has a category and category.disabled is false, include it
  if (product.category && product.category.disabled === true) {
    return true;
  }
  return false;
});
res.status(200).json(filteredProducts);
    
    }
    else{
      console.log('normal products')
      res.status(200).json(products);
    }

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

productRouter.get('/search', async (req, res) => {
  const filter = req.query.filter ? JSON.parse(req.query.filter) : []; // Parse the filter JSON string if provided
  const searchQuery = req.query.q;
  const limit = Number(req.query.limit); // Remove default limit
  const offset = Number(req.query.offset) || 0; // Default offset is 0 if not provided
  const disabledCategory = (req.query.disabledCat);
  console.log(filter);
  try {
    // Perform the search query against the name and description fields

    let searchResults;
    if (limit) {
      const searchQueryConditions = {
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
        ],
      };
      const combinedConditions = {
        $and: [searchQueryConditions, ...filter],
      };

      console.log(combinedConditions);

     searchResults = await Product.find(combinedConditions)
    .skip(offset)
        .limit(limit)
        .populate('category');
  }
  else{
     searchResults = await Product.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search on the name field
        { description: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search on the description field
      ],
    }).populate('category');

  }


   if(disabledCategory === 'false'){
      // Filter products where category.disabled is false
const filteredProducts = searchResults.filter((searchResults) => {
  // If a product has a category and category.disabled is false, include it
  if (searchResults.category && searchResults.category.disabled === false) {
    return true;
  }
  return false;
});
res.status(200).json(filteredProducts);
    
    }
    else if(disabledCategory === 'true'){
      // Filter products where category.disabled is false
const filteredSearchResults = searchResults.filter((searchResults) => {
  // If a product has a category and category.disabled is false, include it
  if (searchResults.category && searchResults.category.disabled === true) {
    return true;
  }
  return false;
});
res.status(200).json(filteredSearchResults);
    
    }
    else{
      console.log('normal products')
      res.status(200).json(searchResults);
    }


  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'An error occurred while searching for products' });
  }
});



productRouter.get('/:id', async(req,res)=>{
    const product = await Product.findById(req.params.id);

    if(!product){
        res.status(500).json({message: 'The product with the given ID was not found.'})
    }
    res.status(200).send(product);
})

productRouter.get('/category/:categoryId', async (req, res) => {
  const { categoryId } = req.params;

  try {
    const products = await Product.find({ 'category': categoryId }).populate('category');
    res.json(products);
    console.log(products._id);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

productRouter.delete('/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'product not found!' });
    }

    // Delete the product from the database
    await Product.findByIdAndRemove(productId);

    // If applicable, delete the image file from Google Drive
    if (product.gdriveFileId &&  product.gdriveFileId!== '1Ru3bJPvlSfkEJ74gEjdgO9jSQtJNFtCu') {
      await drive.files.delete({ fileId: product.gdriveFileId });
    }

    return res.status(200).json({ success: true, message: 'The product and image are deleted!' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


productRouter.put('/publish/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    // Find the product by its ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update the 'disabled' property of the product
    product.disabled = !product.disabled;

    // Save the updated product
    await product.save();
    console.log('success');

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error while updating the product:', error);
    res.status(500).json({ error: 'Failed to update the product' });
  }
});



productRouter.put('/:id', upload.array('images', 5), async (req, res) => {
  const { id } = req.params;
  const updateFields = {};
  const files = req.files;

  try {
      const prevProduct = await Product.findById(id);
      if (!prevProduct) {
          return res.status(404).json({ error: 'Product not found' });
      }

      // Handle text fields
      if (req.body.name) updateFields.name = req.body.name;
      if (req.body.price) updateFields.price = req.body.price;
      if (req.body.stock) updateFields.stock = req.body.stock;
      if (req.body.description) updateFields.description = req.body.description;

      let imageUrls = prevProduct.images;
      let gdriveFileIds = prevProduct.gdriveFileIds;

      if (files && files.length > 0) {
          // Delete previous images from Google Drive
          for (const fileId of gdriveFileIds) {
              try {
                  await drive.files.delete({ fileId });
              } catch (error) {
                  console.error('Error deleting file from Google Drive:', error);
              }
          }

          // Process new images
          imageUrls = [];
          gdriveFileIds = [];
          for (const file of files) {
              try {
                  const croppedImage = await sharp(file.buffer)
                      .resize({ width: 500, height: 500, fit: 'cover' })
                      .webp()
                      .toBuffer();

                  const filename = uuidv4() + '.webp';

                  const fileMetadata = {
                      name: filename,
                      parents: [FOLDER_ID],
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

                  imageUrls.push(filename);
                  gdriveFileIds.push(response.data.id);
              } catch (error) {
                  console.error('Error processing new images:', error);
                  return res.status(500).json({ error: 'Failed to upload new images' });
              }
          }
      }

      updateFields.images = imageUrls;
      updateFields.gdriveFileIds = gdriveFileIds;

      const product = await Product.findByIdAndUpdate(id, updateFields, { new: true });
      res.json(product);
  } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});




productRouter.get('/details/:productId', async (req, res) => {

  const { productId } = req.params;

  try {
    // Find the product by its product_id (custom field)
    const product = await Product.findOne({ product_id: productId }).populate('category');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find all products in the same category except the current product
    const relatedProducts = await Product.find({
      category: product.category._id,
      product_id: { $ne: productId }, // Exclude the current product
    }).populate('category');

    res.status(200).json({
      product,
      relatedProducts,
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





module.exports = productRouter;







