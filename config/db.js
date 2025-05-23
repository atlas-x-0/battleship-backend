import mongoose from 'mongoose';
import dotenv from 'dotenv'; // Assumes you have a .env file at the project root
import config from '../config.js';

dotenv.config(); // Load environment variables from .env file

const connectDB = async () => {
  try {
    // Use mongoURI imported from config.js
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1); // Exit process on connection failure
  }
};

// module.exports = connectDB;
export default connectDB;
