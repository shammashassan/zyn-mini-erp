// utils/softDelete.ts - ENHANCED: Full audit trail for delete/restore

import mongoose, { Model, Document } from 'mongoose';

interface SoftDeleteDocument extends Document<string> {
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  actionHistory?: Array<{
    action: string;
    userId: string | null;
    username: string | null;
    timestamp: Date;
    changes?: any[];
  }>;
  addAuditEntry?: (
    action: string,
    userId?: string | null,
    username?: string | null,
    changes?: any[]
  ) => void;
}

/**
 * Soft delete a document by marking it as deleted
 * ✅ ISSUE #6: Properly tracks who deleted with full audit trail
 */
export async function softDelete<T extends SoftDeleteDocument>(
  model: Model<T>,
  id: string,
  deletedBy: string | null = null,
  username: string | null = null
): Promise<T | null> {
  try {
    const doc = await model.findById(id);
    
    if (!doc) {
      return null;
    }
    
    // ✅ Add comprehensive audit entry BEFORE setting delete fields
    if (doc.addAuditEntry) {
      doc.addAuditEntry('Soft Deleted', deletedBy, username);
      console.log(`✅ Audit trail: Soft deleted by ${username || deletedBy || 'Unknown'}`);
    } else {
      // Fallback: manually add to actionHistory if method doesn't exist
      if (doc.actionHistory) {
        doc.actionHistory.push({
          action: 'Soft Deleted',
          userId: deletedBy,
          username: username,
          timestamp: new Date(),
        });
      }
    }
    
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.deletedBy = deletedBy;
    
    await doc.save();
    
    console.log(`🗑️ Soft deleted document ${id} by user ${username || deletedBy}`);
    
    return doc;
  } catch (error) {
    console.error('Soft delete error:', error);
    throw error;
  }
}

/**
 * Restore a soft-deleted document
 * ✅ ISSUE #6: Properly tracks who restored with full audit trail
 */
export async function restore<T extends SoftDeleteDocument>(
  model: Model<T>,
  id: string,
  restoredBy: string | null = null,
  username: string | null = null
): Promise<T | null> {
  try {
    // First, check if document exists and is deleted
    const doc = await model.findById(id).setOptions({ includeDeleted: true });
    
    if (!doc) {
      console.error(`Document ${id} not found`);
      return null;
    }
    
    if (!doc.isDeleted) {
      console.error(`Document ${id} is not deleted`);
      throw new Error('Document is not deleted');
    }
    
    console.log(`♻️ Restoring document ${id} by user ${username || restoredBy || 'Unknown'}`);
    
    // ✅ ENHANCED: Log what we're about to save
    console.log(`📝 Audit entry for restore:`, {
      action: 'Restored',
      userId: restoredBy,
      username: username,
      timestamp: new Date().toISOString()
    });
    
    // ✅ Use findByIdAndUpdate to avoid triggering unique index validation
    const restoredDoc = await model.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        },
        $push: {
          actionHistory: {
            action: 'Restored',
            userId: restoredBy,
            username: username,
            timestamp: new Date(),
          }
        }
      },
      { 
        new: true, // Return the updated document
        runValidators: false,
      }
    ).setOptions({ includeDeleted: true });
    
    if (!restoredDoc) {
      console.error(`Failed to restore document ${id}`);
      return null;
    }
    
    // ✅ VERIFY: Log the saved audit entry
    const restoredAction = restoredDoc.actionHistory?.find((a: any) => 
      a.action === 'Restored' && 
      Math.abs(new Date(a.timestamp).getTime() - Date.now()) < 5000 // Within 5 seconds
    );
    
    if (restoredAction) {
      console.log(`✅ Verified audit entry saved:`, {
        action: restoredAction.action,
        userId: restoredAction.userId,
        username: restoredAction.username
      });
    } else {
      console.warn(`⚠️ Restore audit entry not found in actionHistory`);
    }
    
    console.log(`✅ Successfully restored document ${id} by ${username || restoredBy}`);
    return restoredDoc;
    
  } catch (error) {
    console.error('Restore error:', error);
    throw error;
  }
}

/**
 * Permanently delete a document (hard delete)
 */
export async function permanentDelete<T extends SoftDeleteDocument>(
  model: Model<T>,
  id: string
): Promise<T | null> {
  try {
    const doc = await model.findByIdAndDelete(id).setOptions({ includeDeleted: true });
    console.log(`🗑️ Permanently deleted document ${id}`);
    return doc;
  } catch (error) {
    console.error('Permanent delete error:', error);
    throw error;
  }
}

/**
 * Get all active (non-deleted) documents
 */
export async function getActive<T extends SoftDeleteDocument>(
  model: Model<T>,
  filter: any = {}
): Promise<T[]> {
  try {
    return await model.find({ ...filter, isDeleted: false });
  } catch (error) {
    console.error('Get active error:', error);
    throw error;
  }
}

/**
 * Get all soft-deleted documents (trash)
 */
export async function getTrash<T extends SoftDeleteDocument>(
  model: Model<T>,
  filter: any = {},
  populateFields: any = null
): Promise<any[]> {
  try {
    let query = model
      .find({ ...filter, isDeleted: true })
      .setOptions({ includeDeleted: true })
      .sort({ deletedAt: -1 });

    if (populateFields) {
      if (typeof populateFields === 'string') {
        query = query.populate({
          path: populateFields,
          options: { includeDeleted: true }
        });
      } else {
        query = query.populate(populateFields);
      }
    }

    const trashed = await query;

    const userIds = Array.from(new Set(trashed.map(item => item.deletedBy).filter(Boolean)));
    const userMap = new Map<string, string>();

    if (userIds.length > 0 && mongoose.connection.db) {
      // Filter out any null values and enforce string type
      const stringIds = userIds.filter((id): id is string => typeof id === "string");

      // Handle both string and ObjectId formats for the _id field
      const objectIds = stringIds
        .filter(id => id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id))
        .map(id => new mongoose.Types.ObjectId(id));

      const users = await mongoose.connection.db.collection('user').find({
        $or: [
          { id: { $in: stringIds } },
          { _id: { $in: [...stringIds, ...objectIds] as any } }
        ]
      }, {
        projection: { id: 1, _id: 1, username: 1, name: 1 }
      }).toArray();

      for (const user of users) {
        const usernameVal = user.username || user.name || '';
        if (usernameVal) {
          if (user.id) userMap.set(user.id, usernameVal);
          if (user._id) {
            userMap.set(user._id.toString(), usernameVal);
          }
        }
      }
    }

    return trashed.map(item => {
      const itemObj = item.toObject();
      if (itemObj.deletedBy) {
        itemObj.deletedBy = userMap.get(itemObj.deletedBy) || itemObj.deletedBy;
      }
      return itemObj;
    });
  } catch (error) {
    console.error('Get trash error:', error);
    throw error;
  }
}

/**
 * Bulk soft delete multiple documents
 * ✅ ISSUE #6: Tracks who deleted each document
 */
export async function bulkSoftDelete<T extends SoftDeleteDocument>(
  model: Model<T>,
  ids: string[],
  deletedBy: string | null = null,
  username: string | null = null
): Promise<{ deletedCount: number; documents: T[] }> {
  try {
    const documents: T[] = [];
    
    for (const id of ids) {
      const doc = await softDelete(model, id, deletedBy, username);
      if (doc) {
        documents.push(doc);
      }
    }
    
    console.log(`✅ Bulk soft deleted ${documents.length} documents by ${username || deletedBy}`);
    
    return {
      deletedCount: documents.length,
      documents,
    };
  } catch (error) {
    console.error('Bulk soft delete error:', error);
    throw error;
  }
}

/**
 * Bulk restore multiple documents
 * ✅ ISSUE #6: Tracks who restored each document
 */
export async function bulkRestore<T extends SoftDeleteDocument>(
  model: Model<T>,
  ids: string[],
  restoredBy: string | null = null,
  username: string | null = null
): Promise<{ restoredCount: number; documents: T[] }> {
  try {
    const documents: T[] = [];
    
    for (const id of ids) {
      const doc = await restore(model, id, restoredBy, username);
      if (doc) {
        documents.push(doc);
      }
    }
    
    console.log(`✅ Bulk restored ${documents.length} documents by ${username || restoredBy}`);
    
    return {
      restoredCount: documents.length,
      documents,
    };
  } catch (error) {
    console.error('Bulk restore error:', error);
    throw error;
  }
}

/**
 * Bulk permanently delete multiple documents
 */
export async function bulkPermanentDelete<T extends SoftDeleteDocument>(
  model: Model<T>,
  ids: string[]
): Promise<{ deletedCount: number }> {
  try {
    const result = await model.deleteMany({
      _id: { $in: ids },
      isDeleted: true,
    }).setOptions({ includeDeleted: true });
    
    console.log(`🗑️ Permanently deleted ${result.deletedCount || 0} documents`);
    
    return {
      deletedCount: result.deletedCount || 0,
    };
  } catch (error) {
    console.error('Bulk permanent delete error:', error);
    throw error;
  }
}

/**
 * Auto-cleanup old soft-deleted documents (e.g., older than 30 days)
 */
export async function autoCleanupTrash<T extends SoftDeleteDocument>(
  model: Model<T>,
  daysOld: number = 30
): Promise<{ deletedCount: number }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await model.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoffDate },
    }).setOptions({ includeDeleted: true });
    
    console.log(`🗑️ Auto-cleanup: Permanently deleted ${result.deletedCount || 0} old documents`);
    
    return {
      deletedCount: result.deletedCount || 0,
    };
  } catch (error) {
    console.error('Auto cleanup error:', error);
    throw error;
  }
}