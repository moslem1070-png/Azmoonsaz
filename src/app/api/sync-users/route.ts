'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Helper function to initialize Firebase Admin SDK, ensuring it's only called when needed.
function initializeAdminApp(): App {
  const apps = getApps();
  if (apps.length) {
    return apps[0];
  }
  
  // This check is critical. The key must be present.
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    // This specific error message will be caught and shown to the user.
    throw new Error('پیکربندی سمت سرور ناقص است. متغیر FIREBASE_SERVICE_ACCOUNT_KEY تنظیم نشده است.');
  }

  try {
    const credentials = JSON.parse(serviceAccountKey);
     return initializeApp({
        credential: cert(credentials),
     });
  } catch (error: any) {
    // This catches errors from JSON.parse if the key is malformed.
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is a valid JSON string. Error: ${error.message}`);
  }
}

// API Route to handle user synchronization and deletion
export async function POST(req: NextRequest) {
  try {
    const adminApp = initializeAdminApp();
    const adminAuth = getAuth(adminApp);
    const adminFirestore = getFirestore(adminApp);

    // 1. Get all users from Firebase Auth
    const listUsersResult = await adminAuth.listUsers();
    const allAuthUids = new Set(listUsersResult.users.map(user => user.uid));

    // 2. Get all user IDs from Firestore
    const usersCollection = await adminFirestore.collection('users').get();
    const allFirestoreUids = new Set(usersCollection.docs.map(doc => doc.id));

    // 3. Find orphaned users (in Auth but not in Firestore)
    const orphanedUids: string[] = [];
    allAuthUids.forEach(uid => {
      if (!allFirestoreUids.has(uid)) {
        orphanedUids.push(uid);
      }
    });

    if (orphanedUids.length === 0) {
      return NextResponse.json({ message: 'هیچ کاربر سرگردانی برای حذف یافت نشد. پایگاه داده و سیستم احراز هویت هماهنگ هستند.' });
    }

    // 4. Delete orphaned users from Firebase Auth
    const deleteResult = await adminAuth.deleteUsers(orphanedUids);

    const deletedCount = deleteResult.successCount;
    const failedCount = deleteResult.failureCount;

    if (failedCount > 0) {
        console.error('Failed to delete some orphaned users:', deleteResult.errors);
        return NextResponse.json({ 
            message: `${deletedCount} کاربر سرگردان با موفقیت حذف شد، اما در حذف ${failedCount} کاربر مشکلی پیش آمد.`,
            errors: deleteResult.errors.map(err => err.message)
        }, { status: 500 });
    }

    return NextResponse.json({ message: `${deletedCount} کاربر سرگردان با موفقیت از سیستم حذف شدند.` });

  } catch (error: any) {
    console.error('Error in sync-users API:', error);
    // The message thrown from initializeAdminApp will be passed through here.
    return NextResponse.json({ error: error.message || 'یک خطای داخلی ناشناخته در سرور رخ داد.' }, { status: 500 });
  }
}
