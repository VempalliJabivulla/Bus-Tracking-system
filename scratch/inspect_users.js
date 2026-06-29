import { Client, Users } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const endpoint = 'https://nyc.cloud.appwrite.io/v1';
const projectId = '6a3957db003326d30b7d';
const apiKey = 'standard_885fcf1108c68e76bcd70d187d931abb51079488347b742dcb655a327bacd0f2953e99c3ceb2900c65a368c02bdcf96c5b12e292e04626d6a5887569a6b9db4dc4c519e3793d52ee66e88f77d211f2728e9c12eb3d8c1065252820b2fd7c37749ab6486ef6c6213de422b3dedcafbcbcb45e417e80b9428a2b2d8d6a7755257e';

const client = new Client();
client
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const users = new Users(client);

async function run() {
  try {
    const list = await users.list();
    console.log(`Total users found: ${list.total}`);
    list.users.forEach(u => {
      console.log(`- ID: ${u.$id}, Name: ${u.name}, Email: ${u.email}, Prefs:`, u.prefs);
    });
  } catch (err) {
    console.error('Failed to list users:', err);
  }
}

run();
