const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

console.log('🔍 MONGO_URI:', process.env.MONGO_URI);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Serve `upload.html` from `public`
app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Serve `retrieve.html` from `public`
app.get('/retrieve', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'retrieve.html'));
});

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
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

// Schema
const documentSchema = new mongoose.Schema({
  documentId: { type: String, unique: true, required: true },
  documentData: Buffer,
  passcode: String
});

const Document = mongoose.model('Document', documentSchema);

// Upload route
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

// Retrieve document
app.get('/document/:passcode', async (req, res) => {
  try {
    const passcode = req.params.passcode;
    if (!passcode) return res.status(400).json({ error: '❌ Passcode is required' });

    const documents = await Document.find();
    let foundDocument = null;

    for (const document of documents) {
      if (await bcrypt.compare(passcode, document.passcode)) {
        foundDocument = document;
        break;
      }
    }

    if (!foundDocument) {
      return res.status(404).json({ error: '❌ Document not found or passcode is incorrect' });
    }

    const downloadUrl = `${req.protocol}://${req.get('host')}/document/${passcode}/download`;
    res.json({ message: '✅ Document found', downloadUrl });
  } catch (error) {
    console.error('❌ Error retrieving document:', error);
    res.status(500).json({ error: '❌ Internal server error' });
  }
});

// Document download route
app.get('/document/:passcode/download', async (req, res) => {
  try {
    const passcode = req.params.passcode;
    if (!passcode) return res.status(400).json({ error: '❌ Passcode is required' });

    const documents = await Document.find();
    let foundDocument = null;

    for (const document of documents) {
      if (await bcrypt.compare(passcode, document.passcode)) {
        foundDocument = document;
        break;
      }
    }

    if (!foundDocument) {
      return res.status(404).json({ error: '❌ Document not found or passcode is incorrect' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${foundDocument.documentId || 'document'}"`);
    res.send(foundDocument.documentData);
  } catch (error) {
    console.error('❌ Error downloading document:', error);
    res.status(500).json({ error: '❌ Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

