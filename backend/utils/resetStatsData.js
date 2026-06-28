const { firestore, admin } = require('../config/firebaseAdmin');

/**
 * resetStatsData
 *
 * Use this ONCE after manually deleting test orders / book requests / donations
 * directly from the Firestore console.
 *
 * Why this is needed:
 * Dashboard numbers like "sold", "revenue", "borrowed" are NOT read from the
 * `orders` or `bookRequests` collections directly. They're computed from:
 *   - handbags/{id}.quantity & .totalQuantity   (sold = totalQuantity - quantity)
 *   - handbags/{id}/salesHistory                (subcollection, drives revenue)
 *   - books/{id}.quantity                       (borrowed = totalQuantity - quantity)
 *   - books/{id}/borrowHistory                  (subcollection)
 *
 * Deleting the top-level `orders` / `bookRequests` docs does NOT touch these
 * fields or subcollections, so stale numbers keep showing up. This script:
 *   1. Resets every handbag's `quantity` back to `totalQuantity` (full stock)
 *   2. Deletes every handbag's `salesHistory` subcollection
 *   3. Resets every book's `quantity` back to `totalQuantity` (full stock)
 *   4. Deletes every book's `borrowHistory` subcollection
 *
 * This does NOT touch real customer data — only stock counters and sales/borrow
 * history. Run this only when you've intentionally wiped test orders/requests
 * and want the dashboard to reflect a clean slate.
 */

const deleteSubcollection = async (parentRef, subcollectionName) => {
  const subRef  = parentRef.collection(subcollectionName);
  const snap    = await subRef.get();
  if (snap.empty) return 0;

  const batchSize = 400; // Firestore batch limit is 500
  let deleted = 0;
  let docs = snap.docs;

  while (docs.length > 0) {
    const chunk = docs.splice(0, batchSize);
    const batch = firestore.batch();
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
};

const resetStatsData = async () => {
  const result = {
    handbagsReset: 0,
    handbagsSalesHistoryDeleted: 0,
    booksReset: 0,
    booksBorrowHistoryDeleted: 0,
    errors: []
  };

  // ── 1 & 2: Handbags ──────────────────────────────────────────────────────
  try {
    const handbagsSnap = await firestore.collection('handbags').get();

    for (const doc of handbagsSnap.docs) {
      try {
        const data = doc.data();
        const fullStock = data.totalQuantity ?? data.quantity ?? 0;

        // Reset quantity back to full stock
        await doc.ref.update({
          quantity: fullStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        result.handbagsReset++;

        // Wipe salesHistory subcollection (drives revenue/totalSold display)
        const deletedCount = await deleteSubcollection(doc.ref, 'salesHistory');
        result.handbagsSalesHistoryDeleted += deletedCount;
      } catch (err) {
        result.errors.push(`Handbag ${doc.id}: ${err.message}`);
      }
    }
  } catch (err) {
    result.errors.push(`Handbags collection error: ${err.message}`);
  }

  // ── 3 & 4: Books ─────────────────────────────────────────────────────────
  try {
    const booksSnap = await firestore.collection('books').get();

    for (const doc of booksSnap.docs) {
      try {
        const data = doc.data();
        const fullStock = data.totalQuantity ?? data.quantity ?? 0;

        // Reset quantity back to full stock
        await doc.ref.update({
          quantity: fullStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        result.booksReset++;

        // Wipe borrowHistory subcollection
        const deletedCount = await deleteSubcollection(doc.ref, 'borrowHistory');
        result.booksBorrowHistoryDeleted += deletedCount;
      } catch (err) {
        result.errors.push(`Book ${doc.id}: ${err.message}`);
      }
    }
  } catch (err) {
    result.errors.push(`Books collection error: ${err.message}`);
  }

  return result;
};

module.exports = { resetStatsData };