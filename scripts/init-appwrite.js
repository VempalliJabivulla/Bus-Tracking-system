import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('=====================================================');
  console.log('🚌 Campus Transit — Appwrite Database Setup Wizard');
  console.log('=====================================================');
  console.log('This script will automatically create the database, collection,');
  console.log('attributes, and permissions in your Appwrite instance.');
  console.log('');

  const endpoint = await question('Enter Appwrite Endpoint (default: https://nyc.cloud.appwrite.io/v1): ') || 'https://nyc.cloud.appwrite.io/v1';
  const projectId = await question('Enter Appwrite Project ID (default: 6a3957db003326d30b7d): ') || '6a3957db003326d30b7d';
  console.log('');
  console.log('To create databases/collections, you need an API Key.');
  console.log('Go to: Appwrite Console -> API Keys -> Create API Key.');
  console.log('Select Scopes: "databases.write", "collections.write", "attributes.write".');
  const apiKey = await question('Enter your Appwrite API Key: ');

  if (!apiKey) {
    console.error('❌ API Key is required to create the backend database.');
    rl.close();
    return;
  }

  rl.close();

  const headers = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey
  };

  const databaseId = 'campus_transit';
  const collectionId = 'live_locations';

  try {
    // 1. Create Database
    console.log(`\n1. Creating database "${databaseId}"...`);
    const dbRes = await fetch(`${endpoint}/databases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        databaseId,
        name: 'Campus Transit'
      })
    });

    if (dbRes.status === 409) {
      console.log('ℹ️ Database already exists.');
    } else if (!dbRes.ok) {
      const errText = await dbRes.text();
      throw new Error(`Failed to create database: ${errText}`);
    } else {
      console.log('✅ Database created successfully.');
    }

    // 2. Create Collection
    console.log(`\n2. Creating collection "${collectionId}"...`);
    const colRes = await fetch(`${endpoint}/databases/${databaseId}/collections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        collectionId,
        name: 'Live Locations',
        permissions: [
          'create("any")',
          'read("any")',
          'update("any")',
          'delete("any")'
        ],
        documentSecurity: false
      })
    });

    if (colRes.status === 409) {
      console.log('ℹ️ Collection already exists.');
    } else if (!colRes.ok) {
      const errText = await colRes.text();
      throw new Error(`Failed to create collection: ${errText}`);
    } else {
      console.log('✅ Collection created successfully.');
    }

    // 3. Create Attributes
    console.log('\n3. Creating attributes in collection...');
    const attributes = [
      { key: 'driverId', type: 'string', size: 128, required: true },
      { key: 'routeId', type: 'string', size: 128, required: true },
      { key: 'latitude', type: 'float', required: true },
      { key: 'longitude', type: 'float', required: true },
      { key: 'speed', type: 'float', required: true },
      { key: 'heading', type: 'float', required: true },
      { key: 'timestamp', type: 'string', size: 128, required: true },
      { key: 'isSharing', type: 'boolean', required: true }
    ];

    for (const attr of attributes) {
      const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes/${attr.type}`;
      const body = { key: attr.key, required: attr.required };
      if (attr.type === 'string') {
        body.size = attr.size;
      }

      console.log(`Creating attribute "${attr.key}"...`);
      const attrRes = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (attrRes.status === 409) {
        console.log(`   Attribute "${attr.key}" already exists.`);
      } else if (!attrRes.ok) {
        const errText = await attrRes.text();
        console.warn(`⚠️ Warning creating attribute "${attr.key}": ${errText}`);
      } else {
        console.log(`✅ Attribute "${attr.key}" created.`);
      }
      
      // Add a slight delay to allow Appwrite to process
      await new Promise(r => setTimeout(r, 800));
    }

    console.log('\n=====================================================');
    console.log('🎉 Setup complete! Your Appwrite database is ready.');
    console.log('Please restart your React development server now.');
    console.log('=====================================================');

  } catch (error) {
    console.error('\n❌ An error occurred during setup:');
    console.error(error.message);
  }
}

main();
