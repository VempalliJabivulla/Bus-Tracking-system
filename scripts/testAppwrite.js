import { Client, Databases } from 'node-appwrite';

const client = new Client();
client
    .setEndpoint('https://nyc.cloud.appwrite.io/v1') // or try without nyc if needed
    .setProject('6a3957db003326d30b7d') // using this as project ID as in .env
    .setKey('standard_885fcf1108c68e76bcd70d187d931abb51079488347b742dcb655a327bacd0f2953e99c3ceb2900c65a368c02bdcf96c5b12e292e04626d6a5887569a6b9db4dc4c519e3793d52ee66e88f77d211f2728e9c12eb3d8c1065252820b2fd7c37749ab6486ef6c6213de422b3dedcafbcbcb45e417e80b9428a2b2d8d6a7755257e');

const databases = new Databases(client);

async function test() {
    try {
        console.log('Testing getting database by ID: 6a3957db003326d30b7d');
        const db = await databases.get('6a3957db003326d30b7d');
        console.log('Success! DB found:', db.name);
    } catch (e) {
        console.log('Error getting db by ID as 6a3957db003326d30b7d:', e.message);
    }
}
test();
