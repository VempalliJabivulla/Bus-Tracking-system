const endpoint = 'https://nyc.cloud.appwrite.io/v1';
const projectId = '6a3957db003326d30b7d';
const apiKey = 'standard_885fcf1108c68e76bcd70d187d931abb51079488347b742dcb655a327bacd0f2953e99c3ceb2900c65a368c02bdcf96c5b12e292e04626d6a5887569a6b9db4dc4c519e3793d52ee66e88f77d211f2728e9c12eb3d8c1065252820b2fd7c37749ab6486ef6c6213de422b3dedcafbcbcb45e417e80b9428a2b2d8d6a7755257e';

const databaseId = 'campus_transit';
const collectionId = 'live_locations';

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey
};

async function run() {
  console.log('Starting automated Appwrite setup...');
  
  try {
    // 1. Create Database
    console.log(`Creating database "${databaseId}"...`);
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
      const err = await dbRes.text();
      console.warn(`Failed to create database (it might already exist): ${err}`);
    } else {
      console.log('✅ Database created successfully.');
    }

    // 2. Create Collection
    console.log(`Creating collection "${collectionId}"...`);
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
      const err = await colRes.text();
      throw new Error(`Failed to create collection: ${err}`);
    } else {
      console.log('✅ Collection created successfully.');
    }

    // 3. Create Attributes
    console.log('Creating schema attributes...');
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
      
      // Delay so Appwrite queues the index creation consecutively
      await new Promise(r => setTimeout(r, 1200));
    }

    console.log('\n🎉 Setup completed successfully! Database and collections are ready.');
  } catch (error) {
    console.error('\n❌ Setup failed:');
    console.error(error.message);
  }
}

run();
