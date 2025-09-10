const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const port = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const uri = process.env.MONGO_URI;
mongoose.connect(uri)
    .then(() => console.log('MongoDB connection established successfully'))
    .catch(err => console.log('MongoDB connection error:', err));

// Define User, Item, and Chat Schemas
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
    category: { type: String, required: true, enum: ['electronic', 'metal', 'plastic', 'paper'] },
    location: { type: String, required: true },
    imageUrl: { type: String, default: null },
    postedBy: { type: String, required: true }
}, {
    timestamps: true,
});

const chatSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const requestSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    postedBy: { type: String, required: true }
}, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);
const Item = mongoose.model('Item', itemSchema);
const Chat = mongoose.model('Chat', chatSchema);
const Request = mongoose.model('Request', requestSchema);

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
    const { location, category } = req.query;
    let query = {};
    
    if (location && location !== 'all') {
        query.location = { $regex: location, $options: 'i' };
    }
    
    if (category && category !== 'all') {
        query.category = category;
    }
    
    Item.find(query)
        .then(items => res.json(items))
        .catch(err => res.status(400).json('Error: ' + err));
});

app.post('/items', async (req, res) => {
    try {
        const { title, description, category, location, imageUrl, postedBy } = req.body;
        const user = await User.findOne({ username: postedBy });
        if (!user) {
            return res.status(401).json('User not authenticated.');
        }

        const newItem = new Item({
            title,
            description,
            category,
            location,
            imageUrl,
            postedBy,
        });

        await newItem.save();
        res.status(201).json('Item posted successfully!');
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

app.post('/requests', async (req, res) => {
    try {
        const { title, description, postedBy } = req.body;
        const user = await User.findOne({ username: postedBy });
        if (!user) {
            return res.status(401).json('User not authenticated.');
        }

        const newRequest = new Request({
            title,
            description,
            postedBy,
        });

        await newRequest.save();
        res.status(201).json('Request posted successfully!');
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

app.get('/requests', async (req, res) => {
    try {
        const requests = await Request.find().sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

app.post('/ai-analyze-image', async (req, res) => {
    const { base64Image } = req.body;
    const prompt = "Analyze this scrap item and categorize it into one of these categories: electronic, metal, plastic, or paper. Also provide a short, concise, two-word title for the item. Format the output as a JSON object with 'title' and 'category' keys. The category must be exactly one of: electronic, metal, plastic, paper. Do not include any other text in the response.";

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Image
                    }
                }
            ]
        }],
    };

    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    try {
        const aiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const aiResult = await aiResponse.json();
        
        if (aiResult.candidates && aiResult.candidates.length > 0) {
            let generatedText = aiResult.candidates[0].content.parts[0].text;
            generatedText = generatedText.replace(/^```json\n|```$/g, '').trim(); 
            const parsedJson = JSON.parse(generatedText);
            
            // Validate category
            const validCategories = ['electronic', 'metal', 'plastic', 'paper'];
            if (!validCategories.includes(parsedJson.category)) {
                parsedJson.category = 'plastic'; // Default fallback
            }
            
            res.json(parsedJson);
        } else {
            res.status(500).json({ error: "AI model did not return a valid response." });
        }
    } catch (error) {
        console.error("Error calling AI API:", error);
        res.status(500).json({ error: "Failed to analyze image." });
    }
});

app.get('/app.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/app.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/chat-history', async (req, res) => {
    const { user1, user2 } = req.query;
    try {
        const messages = await Chat.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load chat history.' });
    }
});

app.get('/my-chats/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const chats = await Chat.find({
            $or: [
                { sender: username },
                { receiver: username }
            ]
        }).select('sender receiver -_id');

        const chatPartners = new Set();
        chats.forEach(chat => {
            if (chat.sender !== username) {
                chatPartners.add(chat.sender);
            }
            if (chat.receiver !== username) {
                chatPartners.add(chat.receiver);
            }
        });

        res.json(Array.from(chatPartners));
    } catch (err) {
        res.status(500).json({ error: 'Failed to load chat list.' });
    }
});

app.get('/chat.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/chat.html'));
});

// Socket.IO for real-time chat
io.on('connection', (socket) => {
    socket.on('joinChat', (data) => {
        const roomName = [data.user1, data.user2].sort().join('_');
        socket.join(roomName);
    });

    socket.on('chatMessage', async (data) => {
        const roomName = [data.sender, data.receiver].sort().join('_');
        const newMessage = new Chat({
            sender: data.sender,
            receiver: data.receiver,
            message: data.message,
        });
        await newMessage.save();
        io.to(roomName).emit('message', newMessage);
    });

    socket.on('disconnect', () => {
    });
});

server.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});




// The fix is on this line: `const apiKey = process.env.GEMINI_API_KEY;`. This ensures your code is reading the environment variable correctly. You must make sure your `.env` file has the line `GEMINI_API_KEY=your_copied_api_key`. 

// After you've updated both files, remember to **stop your server** (by pressing `Ctrl + C` in the terminal) and **start it again** with `node server.js` to load the changes. Your AI feature should now be working!
