const { MongoClient } = require('mongodb');

// Replace <db_password> with your actual password
const uri = 
"mongodb+srv://Kate:yyBAsK2rZBjVzYFe@securedocscluster.tg3bs.mongodb.net/?retryWrites=true&w=majority&appName=SecureDocsCluster";

// Create a MongoDB client
const client = new MongoClient(uri, { useNewUrlParser: true, 
useUnifiedTopology: true });

async function connectDB() {
    try {
        await client.connect();
        console.log("MongoDB Connected Successfully");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
    }
}

connectDB();

