const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: ['https://parchment-77d8f11de10a.herokuapp.com', 'https://www.parchment.pro'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  credentials: true  
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// MongoDB Connection
const myMONGO_URI = process.env.MONGO_URI || 'mongodb+srv://Kate:5201314Kate@securedocscluster.tg3bs.mongodb.net/SecureDocsCluster?retryWrites=true&w=majority&appName=SecureDocsCluster';

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
  passcode: String,      // Stores hashed passcode
  rawPasscode: String    // Stores raw passcode for lookup
});

const Document = mongoose.model('Document', documentSchema, 'securedocs');

// Serve Upload Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'upload.html'));
});

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
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
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

    // Check for duplicate documentId
    const existingDocument = await Document.findOne({ documentId });
    if (existingDocument) {
      return res.status(400).json({ error: '⚠️ Document with this ID already exists. Use a unique ID.' });
    }

    const hashedPasscode = await bcrypt.hash(passcode, 10);

    const newDocument = new Document({
      documentId,
      documentData: req.file.buffer,
      passcode: hashedPasscode,
      rawPasscode: passcode  // Store raw passcode for lookup
    });

    await newDocument.save();
    res.json({ message: '✅ Document uploaded successfully' });
  } catch (error) {
    console.error('❌ Error uploading document:', error);
    res.status(500).json({ error: '❌ Internal server error' });
  }
});

// Retrieve document by userId and passcode
app.get('/document', async (req, res) => {
  const { userId, passcode } = req.query;

  if (!userId || !passcode) {
    return res.status(400).json({ error: '❌ User ID and Passcode are required' });
  }

  const document = await Document.findOne({ documentId: userId });

  if (!document || document.rawPasscode !== passcode) {
    return res.status(404).json({ error: '❌ Document not found or passcode is incorrect' });
  }

  const downloadUrl = `${req.protocol}://${req.get('host')}/document/${encodeURIComponent(document.rawPasscode)}/download`;
  res.json({ message: '✅ Document found', downloadUrl });
});

// Download document
app.get('/document/:passcode/download', async (req, res) => {
  const { passcode } = req.params;

  const document = await Document.findOne({ rawPasscode: passcode });

  if (!document) {
    return res.status(404).json({ error: '❌ Document not found or passcode is incorrect' });
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${document.documentId || 'document'}"`);
  res.send(document.documentData);
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
