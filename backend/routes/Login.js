const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const users = require('../models/User');
const asyncHandler = require('express-async-handler');
const loginRouter = express.Router();
const secretKey = 'your-secret-key';



const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = decoded;
    next();
  });
};


// Login endpoint
loginRouter.post('/login', [
  // Validation rules for username and password
  check('username').notEmpty().withMessage('Username is required'),
  check('password').notEmpty().withMessage('Password is required')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  // Find user in the database based on the provided username
  const user = await users.findOne({ username });

  // Check if user exists and the password matches
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Generate a JWT token
  const token = jwt.sign({ username }, secretKey);

  res.json({ token, name: user.name, username: user.username, role: user.role, cities: user.cities });
}));


loginRouter.post('/signup', [
  // Validation rules for username and password
  check('username').notEmpty().withMessage('Username is required'),
  check('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, name, role, cities } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user in the database
    const newUser = new users({
      username,
      password: hashedPassword,
      name,
      role,
      cities,
    });

    // Save the user to MongoDB
    const savedUser = await newUser.save();

    res.json({ message: 'Signup successful' });
  } catch (error) {
    console.error('Signup failed', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});


loginRouter.get('/users', (req, res) => {
  users.find()
    .then(users => {
      res.status(200).json(users);
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({ error: 'Internal server error' });
    });
});


module.exports = loginRouter;
