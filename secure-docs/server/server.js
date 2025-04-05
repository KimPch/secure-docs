const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const nodemailer = require('nodemailer');
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

// Serve Upload and Retrieve Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'upload.html')));
app.get('/upload', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'upload.html')));
app.get('/retrieve', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'retrieve.html')));

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

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'Outlook365',  // You can change this to 'gmail' or another email service if needed
  auth: {
    user: 'kateshi1088@gmail.com',  // Replace with your actual email
    pass: '5290219002@Qiao',    // Use your email password or app-specific password if 2FA is on
  },
});

// Function to send email with the styled link
async function sendDownloadLink(email, downloadUrl) {
  try {
    await transporter.sendMail({
      from: 'your-email@example.com',  // Sender's email
      to: email,
      subject: 'Your Secure Document Download Link',
      html: `
        <p>Hi,</p>
        <p>You requested to download your document. Click the link below to download:</p>
        <a href="${downloadUrl}" style="color: blue; text-decoration: none; font-size: 16px;">Download the document</a>
        <p>Best regards,</p>
        <p>Your Secure Docs Team</p>
      `, // HTML content with the blue-colored "Download the document" link
    });
    console.log('✅ Email sent successfully');
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

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
      rawPasscode: passcode
    });

    await newDocument.save();
    res.json({ message: '✅ Document uploaded successfully' });
  } catch (error) {
    console.error('❌ Error uploading document:', error);
    res.status(500).json({ error: '❌ Internal server error' });
  }
});

// Retrieve document and send download link via email
app.get('/document', async (req, res) => {
  const { userId, passcode, email } = req.query;

  if (!userId || !passcode || !email) {
    return res.status(400).json({ error: '❌ User ID, Passcode, and Email are required' });
  }

  const document = await Document.findOne({ documentId: userId });

  if (!document || document.rawPasscode !== passcode) {
    return res.status(404).json({ error: '❌ Document not found or passcode is incorrect' });
  }

  const downloadUrl = `https://www.parchment.pro/document/${encodeURIComponent(document.rawPasscode)}/download`;

  // Send the download link via email
  await sendDownloadLink(email, downloadUrl);

  res.json({ message: '✅ Document found, and download link has been sent to your email' });
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
