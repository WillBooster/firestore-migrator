import admin, { firestore } from 'firebase-admin';
import isEqual from 'lodash.isequal';
import cloneDeep from 'lodash.clonedeep';

export interface ServiceAccount {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
}

export interface Modification {
  set?: {
    [name: string]: any;
  };
  rename?: {
    [name: string]: string;
  };
  delete?: string[];
}

export function initializeFirebaseAdmin(serviceAccount?: ServiceAccount): void {
  admin.initializeApp({
    credential: admin.credential.cert(
      serviceAccount ||
        ({
          type: 'service_account',
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY,
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
        } as any)
    ),
  });
}

export async function modify(docSnapshots: FirebaseFirestore.DocumentSnapshot[], mods: Modification): Promise<void> {
  const promises = [] as Promise<any>[];
  for (const snapshot of docSnapshots) {
    const data = snapshot.data();
    if (!data) continue;

    const orgData = cloneDeep(data);

    if (mods.set) Object.assign(data, mods.set);

    const rename = mods.rename || {};
    for (const name of Object.keys(rename)) {
      if (data[name] !== undefined) {
        data[rename[name]] = data[name];
        data[name] = firestore.FieldValue.delete();
      }
    }

    for (const name of mods.delete || []) {
      if (data[name] !== undefined) {
        data[name] = firestore.FieldValue.delete();
      }
    }

    if (!isEqual(data, orgData)) {
      promises.push(snapshot.ref.update(data));
    }
  }
  await Promise.all(promises);
}

export async function getDocumentSnapshots(
  collectionPath: string,
  limit?: number
): Promise<FirebaseFirestore.DocumentSnapshot[]> {
  let docSnapshots: FirebaseFirestore.DocumentSnapshot[];
  let documents: FirebaseFirestore.DocumentReference[] = [];

  if (collectionPath.includes('/*')) {
    let collections: FirebaseFirestore.CollectionReference[] = [];

    const pathItems = collectionPath.split('/').filter((item) => !!item);
    for (let i = 0; i < pathItems.length; i++) {
      const item = pathItems[i];
      if (i === 0) {
        if (item === '*') {
          collections = await admin.firestore().listCollections();
        } else {
          collections = [admin.firestore().collection(item)];
        }
      } else if ((i & 1) === 0) {
        if (item === '*') {
          collections = (await Promise.all(documents.map((d) => d.listCollections()))).flat();
        } else {
          collections = documents.map((d) => d.collection(item));
        }
      } else {
        if (item === '*') {
          documents = (await Promise.all(collections.map((c) => c.listDocuments()))).flat();
          if (limit) {
            documents = documents.slice(0, limit);
          }
        } else {
          documents = collections.map((c) => c.doc(item));
        }
      }
    }
    if ((pathItems.length & 1) === 1) {
      documents = (
        await Promise.all(
          collections.map(async (collection) => {
            const limitedCollection = limit ? collection.limit(limit) : collection;
            const querySnapshot = await limitedCollection.get();
            return querySnapshot.docs.map((d) => d.ref);
          })
        )
      ).flat();
    }
    docSnapshots = await Promise.all(documents.map((d) => d.get()));
  } else {
    const collection = admin.firestore().collection(collectionPath);
    const limitedCollection = limit ? collection.limit(limit) : collection;
    docSnapshots = (await limitedCollection.get()).docs;
  }
  return docSnapshots;
}
