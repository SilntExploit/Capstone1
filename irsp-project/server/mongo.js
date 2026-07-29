const { MONGO_DB, MONGO_URI } = require('./config');

let clientPromise;
let database;
let MongoClient;

function getMongoClientClass() {
    if (MongoClient) return MongoClient;

    try {
        ({ MongoClient } = require('mongodb'));
        return MongoClient;
    } catch (error) {
        throw new Error('MongoDB driver not installed. Run "npm install" in irsp-project first.');
    }
}

async function connectClient() {
    if (!clientPromise) {
        const Client = getMongoClientClass();
        const client = new Client(MONGO_URI, {
            serverSelectionTimeoutMS: 1500,
            connectTimeoutMS: 1500
        });
        clientPromise = client.connect();
    }

    return clientPromise;
}

async function getDb() {
    if (database) return database;

    const client = await connectClient();
    database = client.db(MONGO_DB);
    return database;
}

module.exports = {
    getDb
};
