import { Client, Databases, Users } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = new Client();
client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey('standard_885fcf1108c68e76bcd70d187d931abb51079488347b742dcb655a327bacd0f2953e99c3ceb2900c65a368c02bdcf96c5b12e292e04626d6a5887569a6b9db4dc4c519e3793d52ee66e88f77d211f2728e9c12eb3d8c1065252820b2fd7c37749ab6486ef6c6213de422b3dedcafbcbcb45e417e80b9428a2b2d8d6a7755257e');

const databases = new Databases(client);

async function setup() {
    try {
        console.log('Fetching existing databases...');
        const dbs = await databases.list();
        console.log(`Found ${dbs.total} databases:`);
        dbs.databases.forEach(db => {
            console.log(`- Name: ${db.name}, ID: ${db.$id}`);
        });
    } catch (error) {
        console.error('❌ Setup failed:', error);
    }
}

setup();
