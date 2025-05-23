// If using dotenv, this will read the .env file
// require('dotenv').config(); 

const config = {
  mongoURI: process.env.MONGO_URI || 'mongodb+srv://dbuser03:banana1234@cluster0.tfk0rzo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  port: process.env.PORT || 5001
};

export default config;
