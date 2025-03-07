const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// ✅ Fix 1: Correct MongoDB URI Declaration
const myMONGO_URI = process.env.MONGO_URI || 'mongodb+srv://Kate:5201314Kate@securedocscluster.tg3bs.mongodb.net/SecureDocsCluster?retryWrites=true&w=majority&appName=SecureDocsCluster';

// ✅ Fix 2: Connect to MongoDB
mongoose.connect(myMONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// ✅ Fix 3: CORS Configuration
app.use(cors({
  origin: ['https://parchment-77d8f11de10a.herokuapp.com', 'https://www.parchment.pro'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  credentials: true
}));

// ✅ Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Fix 4: Define Schema Correctly
const documentSchema = new mongoose.Schema({
  documentId: { type: String, unique: true, required: true },
  documentData: Buffer,
  passcode: String
});

// ✅ Fix 5: Correct Collection Name
const Document = mongoose.model('Document', documentSchema, 'securedocs');

// ✅ Fix 6: Serve Static Pages Correctly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

app.get('/retrieve', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'retrieve.html'));
});

// ✅ Fix 7: Multer Setup for File Uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('❌ Invalid file type. Only PDF and DOCX files are allowed.'));
    }
  }
});

// ✅ Fix 8: Upload Document Endpoint
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

// ✅ Fix 9: Retrieve Document Endpoint
app.get('/document', async (req, res) => {
  const { userId, passcode } = req.query;

  if (!userId || !passcode) {
    return res.status(400).json({ error: '❌ User ID and Passcode are required' });
  }

  const document = await Document.findOne({ documentId: userId });

  if (!document || !(await bcrypt.compare(passcode, document.passcode))) {
    return res.status(404).json({ error: '❌ Document not found or passcode is incorrect' });
  }

  const downloadUrl = `${req.protocol}://${req.get('host')}/document/${document._id}/download`;
  res.json({ message: '✅ Document found', downloadUrl });
});

// ✅ Fix 10: Download Document Endpoint
app.get('/document/:id/download', async (req, res) => {
  const { id } = req.params;

  const document = await Document.findById(id);

  if (!document) {
    return res.status(404).json({ error: '❌ Document not found' });
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${document.documentId || 'document'}"`);
  res.send(document.documentData);
});

// ✅ Start Server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});


