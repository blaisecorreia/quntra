'use server';

import { connectToDatabase } from '@/database/mongoose';
import { ObjectId } from 'mongodb';

export const getUserById = async (userId: string): Promise<{ success: boolean; data?: User; error?: string }> => {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      return { success: false, error: 'Database connection failed' };
    }

    const user = await db.collection('user').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return {
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name || '',
        email: user.email || '',
      },
    };
  } catch (error) {
    console.log('getUserById failed', error);
    return { success: false, error: 'Failed to fetch user' };
  }
};
