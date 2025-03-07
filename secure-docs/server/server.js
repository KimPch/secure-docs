const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration to allow specific domains
app.use(cors({
  origin: ['https://parchment-77d8f11de10a.herokuapp.com', 'https://www.parchment.pro'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  credentials: true  // Needed if using authentication or cookies
}));

// Middleware
app.use(express.json());

// Serve static files from the correct 'public' directory (one level up)
app.use(express.static(path.join(__dirname, '..', 'public')));

// MongoDB Connection
const myMONGO_URI = process.env.MONGO_URI || 'your-mongodb-uri-here';

mongoose.connect(myMONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Schema for storing documents
const documentSchema = new mongoose.Schema({
  documentId: { type: String, unique: true, required: true },
  documentData: Buffer,
  passcode: String
});

const Document = mongoose.model('Document', documentSchema, 'securedocs.documents');
// Serve Upload Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'upload.html'));
});

// Serve Upload Page
app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'upload.html'));
});

// Serve Retrieve Page
app.get('/retrieve', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'retrieve.html'));
});

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('❌ Invalid file type. Only PDF and DOCX files are allowed.'));
    }
  }
});

// Upload a document
app.post('/upload', upload.single('document'), async (req, res) => {
  try {
    const { documentId, passcode } = req.body;
    if (!req.file) return res.status(400).json({ error: '❌ No file uploaded' });

    const hashedPasscode = await bcrypt.hash(passcode, 10);

    const newDocument = new Document({
      documentId,
      documentData: req.file.buffer,
      passcode: hashedPasscode
    });

    await newDocument.save();
    res.json({ message: '✅ Document uploaded successfully' });
  } catch (error) {
    console.error('❌ Error uploading document:', error);
    res.status(500).json({ error: '❌ Internal server error' });
  }
});

// Retrieve document by userId and passcode from query parameters
app.get('/document', async (req, res) => {
  const { userId, passcode } = req.query;

  if (!userId || !passcode) {
    return res.status(400).json({ error: '❌ User ID and Passcode are required' });
  }

  // Look for the document by userId
  const document = await Document.findOne({ documentId: userId });

  if (!document || !(await bcrypt.compare(passcode, document.passcode))) {
    return res.status(404).json({ error: '❌ Document not found or passcode is incorrect' });
  }

  const downloadUrl = `${req.protocol}://${req.get('host')}/document/${document.passcode}/download`;
  res.json({ message: '✅ Document found', downloadUrl });
});

// Download document
app.get('/document/:passcode/download', async (req, res) => {
  const { passcode } = req.params;

  if (!passcode) return res.status(400).json({ error: '❌ Passcode is required' });

  // Find document using passcode
  const document = await Document.findOne({ passcode });

  if (!document) {
    return res.status(404).json({ error: '❌ Document not found or passcode is incorrect' });
  }

  // Set headers for downloading the document
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${document.documentId || 'document'}"`);
  res.send(document.documentData);
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

