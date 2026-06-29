const endpoint = 'https://nyc.cloud.appwrite.io/v1';
const projectId = '6a3957db003326d30b7d';
const databaseId = '6a396890002713375dbe';
const apiKey = 'standard_885fcf1108c68e76bcd70d187d931abb51079488347b742dcb655a327bacd0f2953e99c3ceb2900c65a368c02bdcf96c5b12e292e04626d6a5887569a6b9db4dc4c519e3793d52ee66e88f77d211f2728e9c12eb3d8c1065252820b2fd7c37749ab6486ef6c6213de422b3dedcafbcbcb45e417e80b9428a2b2d8d6a7755257e';

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey
};

async function inspect() {
  try {
    console.log('Listing collections for DB:', databaseId);
    const collectionsRes = await fetch(`${endpoint}/databases/${databaseId}/collections`, { headers });
    const collectionsData = await collectionsRes.json();
    console.log('Collections:', collectionsData.collections.map(c => ({ id: c.$id, name: c.name })));

    for (const col of collectionsData.collections) {
      console.log(`\n--- Documents in collection: ${col.name} (${col.$id}) ---`);
      const docsRes = await fetch(`${endpoint}/databases/${databaseId}/collections/${col.$id}/documents`, { headers });
      const docsData = await docsRes.json();
      console.log(`Total: ${docsData.total}`);
      if (docsData.documents.length > 0) {
        console.log(JSON.stringify(docsData.documents.slice(0, 5), null, 2));
      }
    }
  } catch (e) {
    console.error(e);
  }
}

inspect();
