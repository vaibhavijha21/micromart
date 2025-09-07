const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const uri = process.env.MONGO_URI;
mongoose.connect(uri)
    .then(() => console.log('MongoDB connection established successfully'))
    .catch(err => console.log('MongoDB connection error:', err));

// Define User and Item Schemas with Mongoose
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, {
    timestamps: true,
});

const itemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, default: null },
    postedBy: { type: String, required: true }
}, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);
const Item = mongoose.model('Item', itemSchema);

// API Routes
app.post('/users/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json('User already exists!');
        }
        const newUser = new User({ username, email, password });
        await newUser.save();
        res.status(201).json('User created successfully!');
    } catch (err) {
        res.status(500).json('Error: ' + err);
    }
});

app.post('/users/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) {
            return res.status(401).json('Invalid email or password.');
        }
        res.status(200).json({ username: user.username, email: user.email });
    } catch (err) {
        res.status(500).json('Error: ' + err);
    }
});

app.get('/items', (req, res) => {
    Item.find()
        .then(items => res.json(items))
        .catch(err => res.status(400).json('Error: ' + err));
});

app.post('/items', async (req, res) => {
    try {
        const { title, description, imageUrl, postedBy } = req.body;
        const user = await User.findOne({ username: postedBy });
        if (!user) {
            return res.status(401).json('User not authenticated.');
        }

        const newItem = new Item({
            title,
            description,
            imageUrl,
            postedBy,
        });

        await newItem.save();
        res.status(201).json('Item posted successfully!');
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

// Route to serve the main application page
app.get('/app.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/app.html'));
});

// Fallback for root path to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
