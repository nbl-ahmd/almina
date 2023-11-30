let express = require('express'),
    mongoose = require('mongoose'),
    cors = require('cors'),
    bodyParser = require('body-parser'),
    dbConfig = require('./database/db');



const dotenv = require('dotenv');
require('./keep-alive');

dotenv.config(); // Load environment variables from .env file


const uri = process.env.MONGODB_URI;

const bannersRouter = require('./routes/banners.js');
const productsRouter = require('./routes/products');
const categoryRouter = require('./routes/categories')
const orderRouter = require('./routes/Orderrouter');
const batchProductRouter = require('./routes/batchProductRouter'); // Import the batchProductRouter
const storeRouter = require('./routes/storeRouter');
const whatsappRouter = require('./routes/whatsapp');

const fs = require('fs');
const loginRouter = require('./routes/Login');

// MongoDB Configuration
mongoose.Promise = global.Promise;
mongoose.connect(uri, {
    useNewUrlParser: true
}).then(() => {
    console.log('Database sucessfully connected')
},
    error => {
        console.log('Database could not be connected: ' + error)
    }
)

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cors({ origin: '*' }));

app.use('/public', express.static('public'));
app.use('/api/category', categoryRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', orderRouter);
app.use('/api/auth', loginRouter);
app.use('/api/batch', batchProductRouter);
app.use('/api/store', storeRouter);
app.use('/api/whatsapp', whatsappRouter);

app.use(require('prerender-node').set('prerenderToken', 'gJpYFFZOEWUsYIXzO0tJ'));

const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  app.locals.io = io;



const port = process.env.PORT || 4000;


httpServer.listen(port, () => {
    console.log('Connected to port ' + port);
});

app.use((req, res, next) => {
    // Error goes via `next()` method
    setImmediate(() => {
        next(new Error('Something went wrong'));
    });
});

app.use((err, req, res, next) => {
    console.error(err.message);
    if (!err.statusCode) err.statusCode = 500;
    res.status(err.statusCode).json({ error: err.message });
  });

