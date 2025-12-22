'use client';

import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { User } from '@/lib/types';

/**
 * Migrates user documents from random Firestore IDs to be keyed by their `nationalId`.
 * 
 * WARNING: This is a one-time, destructive operation. 
 * Back up your data before running this function.
 * 
 * To run this, you must temporarily relax your Firestore security rules for the 'users' collection
 * to allow reads and writes, as this script operates with admin-like privileges.
 * After migration, be sure to restore your original, stricter security rules.
 *
 * You can call this function from a temporary button or a `useEffect` hook in a protected admin page.
 * 
 * @param firestore - The Firestore instance.
 */
export const migrateUsersToNationalIdKey = async () => {
  let firestore: Firestore;
  try {
    firestore = initializeFirebase().firestore;
  } catch (e) {
    console.error("Could not initialize Firestore:", e);
    throw new Error("Firestore is not available for migration.");
  }

  console.log("Starting user migration...");
  const usersCollectionRef = collection(firestore, 'users');
  const querySnapshot = await getDocs(usersCollectionRef);
  const batch = writeBatch(firestore);

  let migratedCount = 0;
  let failedCount = 0;

  for (const oldDoc of querySnapshot.docs) {
    const userData = oldDoc.data() as User;
    const oldId = oldDoc.id;
    const nationalId = userData.nationalId;

    // Skip if the user document already seems to be migrated (ID is a national code)
    // or if nationalId is missing.
    if (!nationalId || oldId === nationalId) {
        console.log(`Skipping document ${oldId} (already migrated or no nationalId).`);
        continue;
    }

    try {
        console.log(`Migrating user ${oldId} to new ID ${nationalId}...`);

        // Create a reference for the new document with nationalId as the ID
        const newDocRef = doc(firestore, 'users', nationalId);
        
        // Prepare the new data, ensuring the 'id' field is updated if it exists
        const newUserData: User = {
            ...userData,
            id: nationalId, // Ensure the 'id' field inside the doc also uses the nationalId
        };
        
        // Add the creation of the new document to the batch
        batch.set(newDocRef, newUserData);

        // Add the deletion of the old document to the batch
        batch.delete(oldDoc.ref);

        migratedCount++;
    } catch (error) {
        console.error(`Failed to migrate document ${oldId}:`, error);
        failedCount++;
    }
  }

  if (migratedCount === 0 && failedCount === 0) {
      console.log("No users needed migration.");
      return;
  }
  
  if (migratedCount > 0) {
    try {
        await batch.commit();
        console.log(`Successfully migrated ${migratedCount} user documents.`);
    } catch (error) {
        console.error("Error committing batch migration:", error);
        throw new Error("A critical error occurred during the final step of migration.");
    }
  }
  
  if (failedCount > 0) {
      console.log(`${failedCount} documents failed to migrate. Check logs for details.`);
  }
};
