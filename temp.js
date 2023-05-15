// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const { v4: uuidv4 } = require('uuid');
// const cors = require('cors');
// const Banner = require('../models/Banner');

// const sharp = require('sharp');

// const router = express.Router();
// const uploadDir = path.join(__dirname, '..', 'public/banner');
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadDir)
//   },
  
//    filename: function (req, file, cb) {
//      const ext = path.extname(file.originalname);
//      cb(null, uuidv4() + ext);
//    }
// });

// const upload = multer({ storage: storage });

// router.post('/', upload.single('image'),  (req, res) => {
//   const { name, link } = req.body;
//   const image = (req.file.filename)
  
//   const banner = new Banner({ name, image, link });
//   banner.save()
//     .then(() => {
//       res.status(201).json({ message: 'Banner created successfully' });
//     })
//     .catch(error => {
//       console.log(error);
//       res.status(500).json({ error: 'Internal server error' });
//     });
// });

// router.get('/', (req, res) => {
//   Banner.find()
//     .then(banners => {
//       res.status(200).json(banners);
//     })
//     .catch(error => {
//       console.log(error);
//       res.status(500).json({ error: 'Internal server error' });
//     });
// });

// router.get('/images/:filename', (req, res) => {
//   const { filename } = req.params;
//   res.sendFile(path.join(uploadDir, filename));
// });

// module.exports = router;






// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const { v4: uuidv4 } = require('uuid');
// const cors = require('cors');
// const Banner = require('../models/Banner');

// const sharp = require('sharp');

// const router = express.Router();
// const uploadDir = path.join(__dirname, '..', 'public/banner');
// const resizedDir = path.join(__dirname, '..', 'public/banner/resized'); // specify destination folder for resized image
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// router.post('/', upload.single('image'), async (req, res) => {
//   const { name, link } = req.body;
//   const image = req.file;

//   // resize the image
//   const resizedImage = await sharp(image.buffer)
//   .resize(200)
//   .webp()
//   .toBuffer();

//   // generate a new filename for the resized image
//   const resizedFilename = uuidv4() + '.jpg';

//   // save the resized image to the resized directory
//   await sharp(resizedImage).toFile(path.join(resizedDir, resizedFilename));

//   const banner = new Banner({ name, image: resizedFilename, link }); // save the resized filename to the database
//   banner.save()
//     .then(() => {
//       res.status(201).json({ message: 'Banner created successfully' });
//     })
//     .catch(error => {
//       console.log(error);
//       res.status(500).json({ error: 'Internal server error' });
//     });
// });

// router.get('/', (req, res) => {
//   Banner.find()
//     .then(banners => {
//       res.status(200).json(banners);
//     })
//     .catch(error => {
//       console.log(error);
//       res.status(500).json({ error: 'Internal server error' });
//     });
// });

// router.get('/images/:filename', (req, res) => {
//   const { filename } = req.params;
//   res.sendFile(path.join(resizedDir, filename)); // serve the resized image instead of the original image
// });

// module.exports = router;



const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const Banner = require('../models/Banner');

const sharp = require('sharp');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'public/banner');
const resizedDir = path.join(__dirname, '..', 'public/banner/resized'); // specify destination folder for resized image
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('image'), async (req, res) => {
  const { name, link } = req.body;
  const image = req.file;

  // crop the image into a square
  const croppedImage = await sharp(image.buffer)
    .resize({ width: 300, height: 300, fit: 'cover' })
    .toBuffer();

  // convert the image to web format
  const webpImage = await sharp(croppedImage)
    .webp()
    .toBuffer();

  // resize the image to the desired size
  const resizedImage = await sharp(webpImage)
    .resize({ width: 200, height: 200 })
    .toBuffer();

  // generate a new filename for the resized image
  const resizedFilename = uuidv4() + '.webp';

  // save the resized image to the resized directory
  await sharp(resizedImage).toFile(path.join(resizedDir, resizedFilename));

  const banner = new Banner({ name, image: resizedFilename, link }); // save the resized filename to the database
  banner.save()
    .then(() => {
      res.status(201).json({ message: 'Banner created successfully' });
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({ error: 'Internal server error' });
    });
});

router.get('/', (req, res) => {
  Banner.find()
    .then(banners => {
      res.status(200).json(banners);
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({ error: 'Internal server error' });
    });
});

router.get('/images/:filename', (req, res) => {
  const { filename } = req.params;
  res.sendFile(path.join(resizedDir, filename)); // serve the resized image instead of the original image
});

module.exports = router;
