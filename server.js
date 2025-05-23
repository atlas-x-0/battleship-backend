// server/server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import config from './config.js';
import cors from 'cors';

// Route imports
import usersRoutes from './routes/users.js';
import gamesRoutes from './routes/games.js';

// Connect to Database
connectDB();

const app = express();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cookieParser()); // For parsing cookies
app.use(cors());

app.get('/', (req, res) => res.send('API Running'));

// Define Routes
app.use('/api/users', usersRoutes);
app.use('/api/games', gamesRoutes);
// app.use('/api/scores', scoresRoutes);

const PORT = config.port || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
