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
// Load dependencies
// const { nanoid } = require('nanoid');

// Define the prefix for product IDs
const PRODUCT_ID_PREFIX = 'PD';

// Keep track of the last used product number
let lastProductNumber = 0;

// Generate a new product ID
function generateProductId() {
    // Increment the last used product number
    lastProductNumber++;

    // Combine the prefix and the number to form the product ID
    return `${PRODUCT_ID_PREFIX}-${lastProductNumber.toString().padStart(4, '0')}`;
}




productRouter.post('/', upload.single('image'), async (req, res) => {
     const category = await Category.findById(req.body.category);
    const {
        name,
        price,
        stock
    } = req.body;
    const vat = req.body.vat == 'true';
    const sale = req.body.sale == 'true';
    const featured = req.body.featured == 'true';
    const image = req.file;
    // const product_id = generateProductId(); 
    // Extract the EXIF orientation
    let orientation = 1;
    try {
      const exifData = await sharp(image.buffer).metadata();
      orientation = exifData.orientation || 1;
    } catch (error) {
      console.error('Error reading EXIF data:', error);
    }
    
    // if (!category) return res.status(400).send('Invalid Category')
    // crop the image into a square
    const croppedImage = await sharp(image.buffer)
        .resize({ width: 500, height: 500, fit: 'cover' })
        .rotate()
        .webp()
        .toBuffer();

    // generate a new filename for the resized image
    const Filename = uuidv4() + '.webp';
    // save the resized image to the resized directory
    await sharp(croppedImage).toFile(path.join(uploadDir, Filename));

    const product = new Product({
        product_id: 'a',
        name,
         image: Filename,
         category,
         featured,
         price,
         vat,
         stock,
         sale

    }); // save the resized filename to the database
    product.save()
        .then(() => {
            res.status(201).json({ message: 'Product added successfully' });
        })
        .catch(error => {
            console.log(error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

productRouter.get('/', (req, res) => {
    Product.find().populate('category')
        .then(products => {
            res.status(200).json(products);
        })
        .catch(error => {
            console.log(error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

productRouter.get('/images/:filename', (req, res) => {
    const { filename } = req.params;
    res.sendFile(path.join(uploadDir, filename)); // serve the resized image instead of the original image
});

productRouter.get('/:id', async(req,res)=>{
    const product = await Product.findById(req.params.id);

    if(!product){
        res.status(500).json({message: 'The product with the given ID was not found.'})
    }
    res.status(200).send(product);
})

productRouter.delete('/:id', (req, res) => {
    Product.findByIdAndRemove(req.params.id)
        .then(Product => {
            if(Product) {
                fs.unlink(path.join(uploadDir, Product.image), (error) => {
                    if (error) {
                      console.log('Error deleting image file:', error);
                    }
                   
                  });
                return res.status(200).json({success: true, message: 'the Banner is deleted!'})
            } else{
                return res.status(404).json({success: false, message: "Banner not found!"})
            }
    }).catch(err=>{
        return res.status(400).json({success: false, error: err})
    })


      // If applicable, delete the image file from the server's file system
    
  })


//   categoryRouter.put('/:id', upload.single('image') async (req, res)=> {
//     const category = await Category.findByIdAndUpdate(
//         req.params.id,
//         {
//             name: req.body.name,
//             // image: req.body.image
//         },
//         {new: true}
//     )
//     if (!category)
//         return res.status(400).send('the category cannot be created!')

//     res.send(category);
// })
// productRouter.put('/:id', async (req, res)=> {
//     const category = await Category.findById(req.body.category);
//     const {
//         name,
//         price,
//         stock
//     } = req.body;
//     const vat = req.body.vat == 'true';
//     const sale = req.body.sale == 'true';
//     const featured = req.body.featured == 'true';
//     const image = req.file;
//     // const product_id = generateProductId(); 
//     // Extract the EXIF orientation
//     let orientation = 1;
//     try {
//       const exifData = await sharp(image.buffer).metadata();
//       orientation = exifData.orientation || 1;
//     } catch (error) {
//       console.error('Error reading EXIF data:', error);
//     }
    
//     // if (!category) return res.status(400).send('Invalid Category')
//     // crop the image into a square
//     const croppedImage = await sharp(image.buffer)
//         .resize({ width: 500, height: 500, fit: 'cover' })
//         .rotate()
//         .webp()
//         .toBuffer();

//     // generate a new filename for the resized image
//     const Filename = uuidv4() + '.webp';
//     // save the resized image to the resized directory
//     await sharp(croppedImage).toFile(path.join(uploadDir, Filename));
//     const product = await Category.findByIdAndUpdate(
//         req.params.id,
//         {
//         name,
//          image,
//          category,
//          featured,
//          price,
//          vat,
//          stock,
//          sale
//         },
//         {new: true}
//     )
//     if (!product)
//         return res.status(400).send('the product cannot be updated!')

//     res.send(product);
// })

productRouter.put('/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const updateFields = {};
    
    // Check if each field is present in the request body and update the corresponding field
    if (req.body.name) {
      updateFields.name = req.body.name;
      console.log(req.body);
    }
    
    if (req.body.price) {
      updateFields.price = req.body.price;
    }
    if (req.body.category) {
        updateFields.category = req.body.category;
      }
    
    if (req.body.stock) {
      updateFields.stock = req.body.stock;
    }
    
    if (req.body.vat) {
      updateFields.vat = req.body.vat === 'true';
    }
    
    if (req.body.sale) {
      updateFields.sale = req.body.sale === 'true';
    }
    
    if (req.body.featured) {
      updateFields.featured = req.body.featured === 'true';
    }
    
    if (req.file) {
      const image = req.file;
      console.log(req.file);
      // Extract the EXIF orientation
      let orientation = 1;
      try {
        const exifData = await sharp(image.buffer).metadata();
        orientation = exifData.orientation || 1;
      } catch (error) {
        console.error('Error reading EXIF data:', error);
      }
      
      // Crop the image into a square
      const croppedImage = await sharp(image.buffer)
        .resize({ width: 500, height: 500, fit: 'cover' })
        .rotate()
        .webp()
        .toBuffer();
      
      // Generate a new filename for the resized image
      const filename = uuidv4() + '.webp'; // Replace with the actual path to your upload directory
      const resizedImagePath = path.join(uploadDir, filename);
      
      // Save the resized image to the resized directory
      await sharp(croppedImage).toFile(resizedImagePath);
      
      updateFields.image = filename;
    }
  
    try {
      const product = await Product.findByIdAndUpdate(id, updateFields, { new: true });
      
      if (!product) {
        return res.status(400).send('The product cannot be updated!');
      }
      
      res.send(product);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).send('An error occurred while updating the product');
    }
  });
  
module.exports = productRouter;







