const mongoose = require('mongoose');

// Define the schema for the document
const documentSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  documentData: { type: String, required: true },
  passcode: { type: String, required: true } // Add the passcode field
});

// Create the model
const Document = mongoose.model('Document', documentSchema);

// Export the model so it can be used elsewhere
module.exports = Document;
