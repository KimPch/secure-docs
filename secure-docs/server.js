// Load environment variables
require('dotenv').config();

// Import required libraries
const express = require('express');
const mongoose = require('mongoose');

// Initialize the Express app
const app = express();

// Middleware to parse incoming JSON requests
app.use(express.json());

// MongoDB connection URI from environment variables
const mongoURI = process.env.MONGO_URI;  // Your MongoDB connection URI

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// Sample route to check if server is running
app.get('/', (req, res) => {
  res.send('Hello, the server is running!');
});

// Define a simple route to test MongoDB collection
app.post('/add-document', (req, res) => {
  const { documentId, documentData, passcode } = req.body;

  // Check if all required fields are present
  if (!documentId || !documentData || !passcode) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Define the document schema and model
  const documentSchema = new mongoose.Schema({
    documentId: { type: String, required: true },
    documentData: { type: String, required: true },
    passcode: { type: String, required: true },
  });

  const Document = mongoose.model('Document', documentSchema);

  // Create a new document
  const newDocument = new Document({
    documentId,
    documentData,
    passcode,
  });

  // Save the document to the database
  newDocument.save()
    .then(() => {
      res.status(200).json({ message: 'Document added successfully' });
    })
    .catch((err) => {
      res.status(500).json({ message: 'Error saving document', error: err });
    });
});

// Port where the server will run
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


