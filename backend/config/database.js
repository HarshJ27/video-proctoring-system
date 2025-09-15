import { MongoClient } from 'mongodb';
import { config } from '../src/utils/config.js';

let db = null;
let client = null;

// Simple connect function
export const connectDB = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    client = new MongoClient(config.database.uri);
    await client.connect();
    
    db = client.db(config.database.dbName);
    
    console.log(`✅ Connected to MongoDB: ${config.database.dbName}`);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Get database instance
export const getDB = () => {
  if (!db) {
    throw new Error('Database not connected');
  }
  return db;
};

// Get collection helper
export const getCollection = (collectionName) => {
  return getDB().collection(collectionName);
};

// Disconnect function
export const disconnectDB = async () => {
  if (client) {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
};

export default { connectDB, getDB, getCollection, disconnectDB };