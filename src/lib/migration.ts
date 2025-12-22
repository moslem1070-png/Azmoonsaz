'use client';

import {
  collection,
  getDocs,
  doc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Migrates user documents from random Firestore IDs to be keyed by their `nationalId`.
 * 
 * WARNING: This is a one-time, destructive operation. 
 * Back up your data before running this function.
 * 
 * @param firestore The active Firestore instance.
 */
export const migrateUsersToNationalIdKey = async (firestore: Firestore) => {
  if (!firestore) {
    throw new Error("Firestore instance not provided to migration script.");
  }

  console.log("Starting user migration...");
  const usersCollectionRef = collection(firestore, 'users');
  const querySnapshot = await getDocs(usersCollectionRef);
  
  if (querySnapshot.empty) {
    console.log("No user documents found to migrate.");
    return;
  }

  const batch = writeBatch(firestore);

  let migratedCount = 0;
  let failedCount = 0;

  for (const oldDoc of querySnapshot.docs) {
    const userData = oldDoc.data() as User;
    const oldId = oldDoc.id;
    const nationalId = userData.nationalId;

    if (!nationalId || oldId === nationalId) {
        console.log(`Skipping document ${oldId} (already migrated or no nationalId).`);
        continue;
    }

    try {
        console.log(`Migrating user ${oldId} to new ID ${nationalId}...`);
        const newDocRef = doc(firestore, 'users', nationalId);
        
        const newUserData: User = {
            ...userData,
            id: nationalId,
        };
        
        batch.set(newDocRef, newUserData);
        batch.delete(oldDoc.ref);
        migratedCount++;
    } catch (error) {
        console.error(`Failed to stage migration for document ${oldId}:`, error);
        failedCount++;
    }
  }

  if (failedCount > 0) {
    throw new Error(`${failedCount} documents failed to stage for migration. Aborting batch commit.`);
  }

  if (migratedCount === 0) {
      console.log("No users needed migration.");
      return;
  }
  
  try {
    await batch.commit();
    console.log(`Successfully committed migration for ${migratedCount} user documents.`);
  } catch (error) {
    console.error("Error committing batch migration:", error);
    throw new Error("A critical error occurred during the final batch commit step.");
  }
};
