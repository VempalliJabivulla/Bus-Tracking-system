const endpoint = 'https://nyc.cloud.appwrite.io/v1';
const projectId = '6a3957db003326d30b7d';
const databaseId = '6a396890002713375dbe';
const apiKey = 'standard_885fcf1108c68e76bcd70d187d931abb51079488347b742dcb655a327bacd0f2953e99c3ceb2900c65a368c02bdcf96c5b12e292e04626d6a5887569a6b9db4dc4c519e3793d52ee66e88f77d211f2728e9c12eb3d8c1065252820b2fd7c37749ab6486ef6c6213de422b3dedcafbcbcb45e417e80b9428a2b2d8d6a7755257e';

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey
};

async function testRoutes() {
  try {
    const url = `${endpoint}/databases/${databaseId}/collections/routes/documents`;
    console.log('Fetching routes from:', url);
    const res = await fetch(url, { headers });
    console.log('Routes status:', res.status);
    const data = await res.json();
    console.log('Routes data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

testRoutes();
