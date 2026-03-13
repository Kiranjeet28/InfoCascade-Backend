const mongoose = require('mongoose');

async function fixLegacyStudentIdIndex() {
  try {
    const collection = mongoose.connection.collection('students');
    const indexes = await collection.indexes();
    const badIndex = indexes.find(
      (idx) => idx.unique === true && idx.key && idx.key.id === 1
    );

    if (badIndex) {
      await collection.dropIndex(badIndex.name);
      console.log(`Dropped legacy unique index '${badIndex.name}' on students.id`);
    }
  } catch (err) {
    // Namespace may not exist yet on first boot; ignore in that case.
    if (err && err.codeName !== 'NamespaceNotFound') {
      console.warn('Could not verify/drop legacy students.id index:', err.message);
    }
  }
}

async function connectWithRetry(uri, options, attempts = 3, delayMs = 2000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await mongoose.connect(uri, options);
      console.log('MongoDB connected successfully');
      return;
    } catch (err) {
      const isLast = i === attempts;
      console.error(`MongoDB connection attempt ${i} failed:`, err.message);
      if (isLast) throw err;
      const wait = delayMs * i;
      console.log(`Retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/infocascade';
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  try {
    await connectWithRetry(uri, options, 3, 2000);
    await fixLegacyStudentIdIndex();
  } catch (error) {
    console.error('MongoDB connection failed after retries:', error.message);
    throw error;
  }
}

module.exports = connectDB;
