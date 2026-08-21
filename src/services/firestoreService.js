import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { INITIAL_TABLES, INITIAL_MENU_ITEMS, INITIAL_STAFF } from './seedData';

// --- Local Storage Cache & Fallback ---
const LOCAL_STORAGE_KEYS = {
  TABLES: 'gourmet_qr_tables',
  MENU: 'gourmet_qr_menu',
  ORDERS: 'gourmet_qr_orders',
  WAITER_CALLS: 'gourmet_qr_waiter_calls',
  STAFF: 'gourmet_qr_staff',
};

function getLocalData(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalData(key, data, notify = false) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (notify) {
      window.dispatchEvent(new CustomEvent(`gourmet_store_${key}`, { detail: data }));
    }
  } catch (e) {
    console.error('LocalStorage write error', e);
  }
}

// Initialize mock storage if empty
function initializeMockStorage() {
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.TABLES)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TABLES, JSON.stringify(INITIAL_TABLES));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.MENU)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.MENU, JSON.stringify(INITIAL_MENU_ITEMS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.STAFF)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.WAITER_CALLS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.WAITER_CALLS, JSON.stringify([]));
  }
}

initializeMockStorage();

// Helper to sanitize objects for Firestore (removes undefined values that Firestore rejects)
function sanitizeForFirestore(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

// Helper to extract timestamp ms
function getTimestampMs(val) {
  if (!val) return 0;
  if (val.seconds) return val.seconds * 1000;
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

// ==========================================
// 1. TABLES SERVICE
// ==========================================

export function subscribeTables(callback) {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'tables'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const tables = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            const sorted = tables.sort(
              (a, b) => (Number(a.tableNumber) || 0) - (Number(b.tableNumber) || 0)
            );
            setLocalData(LOCAL_STORAGE_KEYS.TABLES, sorted, false);
            callback(sorted);
          } else {
            callback(getLocalData(LOCAL_STORAGE_KEYS.TABLES, INITIAL_TABLES));
          }
        },
        (error) => {
          console.warn('Firestore tables subscription fallback:', error.message);
          callback(getLocalData(LOCAL_STORAGE_KEYS.TABLES, INITIAL_TABLES));
        }
      );
      return () => {
        try {
          unsub();
        } catch {}
      };
    } catch (err) {
      console.warn('Failed to subscribe tables:', err);
    }
  }

  // Local fallback
  const emit = () => callback(getLocalData(LOCAL_STORAGE_KEYS.TABLES, INITIAL_TABLES));
  emit();
  const listener = () => emit();
  window.addEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.TABLES}`, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.TABLES}`, listener);
    window.removeEventListener('storage', listener);
  };
}

export async function getTableById(tableId) {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'tables', tableId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    } catch (err) {
      console.warn('Error fetching table from Firestore:', err);
    }
  }
  const local = getLocalData(LOCAL_STORAGE_KEYS.TABLES, INITIAL_TABLES);
  return local.find((t) => t.id === tableId) || null;
}

export async function addTable(tableData) {
  const num = Number(tableData.tableNumber) || 1;
  const customId = tableData.id || `table_${String(num).padStart(2, '0')}`;
  
  const payload = sanitizeForFirestore({
    id: customId,
    tableNumber: num,
    name: tableData.name || `Table ${num}`,
    capacity: Number(tableData.capacity) || 4,
    isActive: tableData.isActive ?? true,
    createdAt: new Date().toISOString(),
  });

  // 1. Update local store
  const current = getLocalData(LOCAL_STORAGE_KEYS.TABLES, INITIAL_TABLES);
  setLocalData(LOCAL_STORAGE_KEYS.TABLES, [...current.filter((t) => t.id !== customId), payload], true);

  // 2. Write directly to Firestore
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'tables', customId);
      await setDoc(docRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('❌ Firestore addTable error:', e);
      throw e;
    }
  }
  return customId;
}

export async function updateTable(tableId, updates) {
  const current = getLocalData(LOCAL_STORAGE_KEYS.TABLES, INITIAL_TABLES);
  const updated = current.map((t) => (t.id === tableId ? { ...t, ...updates } : t));
  setLocalData(LOCAL_STORAGE_KEYS.TABLES, updated, true);

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'tables', tableId);
      await setDoc(
        docRef,
        sanitizeForFirestore({
          ...updates,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    } catch (e) {
      console.error('❌ Firestore updateTable error:', e);
      throw e;
    }
  }
}

export async function deleteTable(tableId) {
  const current = getLocalData(LOCAL_STORAGE_KEYS.TABLES, INITIAL_TABLES);
  const filtered = current.filter((t) => t.id !== tableId);
  setLocalData(LOCAL_STORAGE_KEYS.TABLES, filtered, true);

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'tables', tableId));
    } catch (e) {
      console.error('❌ Firestore deleteTable error:', e);
      throw e;
    }
  }
}

// ==========================================
// 2. MENU ITEMS SERVICE
// ==========================================

export function subscribeMenuItems(callback) {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'menuItems'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setLocalData(LOCAL_STORAGE_KEYS.MENU, items, false);
            callback(items);
          } else {
            callback(getLocalData(LOCAL_STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS));
          }
        },
        (error) => {
          console.warn('Firestore menu items subscription fallback:', error.message);
          callback(getLocalData(LOCAL_STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS));
        }
      );
      return () => {
        try {
          unsub();
        } catch {}
      };
    } catch (err) {
      console.warn('Failed to subscribe menu items:', err);
    }
  }

  // Local fallback
  const emit = () => callback(getLocalData(LOCAL_STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS));
  emit();
  const listener = () => emit();
  window.addEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.MENU}`, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.MENU}`, listener);
    window.removeEventListener('storage', listener);
  };
}

export async function addMenuItem(itemData) {
  const customId = itemData.id || `item_${Date.now()}`;
  const payload = sanitizeForFirestore({
    id: customId,
    name: itemData.name || '',
    category: itemData.category || 'Main Course',
    price: Number(itemData.price) || 0,
    description: itemData.description || '',
    prepTime: itemData.prepTime || '15 mins',
    isVeg: itemData.isVeg ?? true,
    isAvailable: itemData.isAvailable ?? true,
    spicyLevel: Number(itemData.spicyLevel) || 0,
    imageUrl: itemData.imageUrl || '',
    createdAt: new Date().toISOString(),
  });

  const current = getLocalData(LOCAL_STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS);
  setLocalData(LOCAL_STORAGE_KEYS.MENU, [payload, ...current.filter((i) => i.id !== customId)], true);

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'menuItems', customId);
      await setDoc(docRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return customId;
    } catch (e) {
      console.error('❌ Firestore addMenuItem error:', e);
      throw e;
    }
  }
  return customId;
}

export async function updateMenuItem(itemId, updates) {
  const current = getLocalData(LOCAL_STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS);
  const updated = current.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
  setLocalData(LOCAL_STORAGE_KEYS.MENU, updated, true);

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'menuItems', itemId);
      await setDoc(
        docRef,
        sanitizeForFirestore({
          ...updates,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    } catch (e) {
      console.error('❌ Firestore updateMenuItem error:', e);
      throw e;
    }
  }
}

export async function deleteMenuItem(itemId) {
  const current = getLocalData(LOCAL_STORAGE_KEYS.MENU, INITIAL_MENU_ITEMS);
  const filtered = current.filter((item) => item.id !== itemId);
  setLocalData(LOCAL_STORAGE_KEYS.MENU, filtered, true);

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'menuItems', itemId);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('❌ Firestore deleteMenuItem error:', e);
      throw e;
    }
  }
}

// ==========================================
// 3. ORDERS SERVICE
// ==========================================

export async function createOrder(orderData) {
  const orderId = orderData.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const tableNum = Number(orderData.tableNumber) || 1;
  const shortCode = orderId.slice(-4).toUpperCase();
  const orderNumber = orderData.orderNumber || `#T${tableNum}-${shortCode}`;

  const cleanItems = (orderData.items || []).map((item) => ({
    itemId: item.itemId || item.id || '',
    name: item.name || '',
    price: Number(item.price) || 0,
    qty: Number(item.qty) || 1,
    notes: item.notes || '',
    isVeg: item.isVeg ?? true,
  }));

  const payload = sanitizeForFirestore({
    id: orderId,
    orderNumber,
    tableId: orderData.tableId || 'table_01',
    tableNumber: tableNum,
    items: cleanItems,
    subtotal: Number(orderData.subtotal) || 0,
    taxPercent: Number(orderData.taxPercent) || 5,
    taxAmount: Number(orderData.taxAmount) || 0,
    totalAmount: Number(orderData.totalAmount) || 0,
    customerNotes: orderData.customerNotes || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 1. Write to local storage
  const current = getLocalData(LOCAL_STORAGE_KEYS.ORDERS, []);
  setLocalData(LOCAL_STORAGE_KEYS.ORDERS, [payload, ...current.filter((o) => o.id !== orderId)], true);

  // 2. Write to Firestore using explicit document ID
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'orders', orderId);
      await setDoc(docRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return orderId;
    } catch (e) {
      console.error('❌ Firestore createOrder error:', e);
      throw e;
    }
  }
  return orderId;
}

export function subscribeOrder(orderId, callback) {
  if (isFirebaseConfigured && db && orderId) {
    try {
      const docRef = doc(db, 'orders', orderId);
      const unsub = onSnapshot(
        docRef,
        async (snap) => {
          if (snap.exists()) {
            callback({ ...snap.data(), id: snap.id });
          } else {
            // Check if document exists with field id == orderId (legacy orders)
            try {
              const q = query(collection(db, 'orders'), where('id', '==', orderId));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                const d = querySnap.docs[0];
                callback({ ...d.data(), id: d.id });
                return;
              }
            } catch (qe) {}
            const orders = getLocalData(LOCAL_STORAGE_KEYS.ORDERS, []);
            const found = orders.find((o) => o.id === orderId) || null;
            callback(found);
          }
        },
        (err) => {
          console.warn('Firestore single order fallback:', err.message);
          const orders = getLocalData(LOCAL_STORAGE_KEYS.ORDERS, []);
          const found = orders.find((o) => o.id === orderId) || null;
          callback(found);
        }
      );
      return () => {
        try {
          unsub();
        } catch {}
      };
    } catch (err) {
      console.warn('Failed to subscribe order:', err);
    }
  }

  // Local fallback
  const emit = () => {
    const orders = getLocalData(LOCAL_STORAGE_KEYS.ORDERS, []);
    const found = orders.find((o) => o.id === orderId) || null;
    callback(found);
  };
  emit();
  const listener = () => emit();
  window.addEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.ORDERS}`, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.ORDERS}`, listener);
    window.removeEventListener('storage', listener);
  };
}

export function subscribeActiveOrders(callback) {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'orders'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const orders = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          const active = orders
            .filter((o) => ['pending', 'preparing', 'ready'].includes((o.status || '').toLowerCase()))
            .sort((a, b) => getTimestampMs(a.createdAt) - getTimestampMs(b.createdAt));
          callback(active);
        },
        (error) => {
          console.warn('Firestore active orders fallback:', error.message);
          const local = getLocalData(LOCAL_STORAGE_KEYS.ORDERS, []);
          const active = local
            .filter((o) => ['pending', 'preparing', 'ready'].includes(o.status))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          callback(active);
        }
      );
      return () => {
        try {
          unsub();
        } catch {}
      };
    } catch (err) {
      console.warn('Failed to subscribe active orders:', err);
    }
  }

  // Local fallback
  const emit = () => {
    const orders = getLocalData(LOCAL_STORAGE_KEYS.ORDERS, []);
    const active = orders
      .filter((o) => ['pending', 'preparing', 'ready'].includes(o.status))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    callback(active);
  };
  emit();
  const listener = () => emit();
  window.addEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.ORDERS}`, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.ORDERS}`, listener);
    window.removeEventListener('storage', listener);
  };
}

export function subscribeAllOrders(callback) {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'orders'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const orders = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          const sorted = orders.sort(
            (a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)
          );
          setLocalData(LOCAL_STORAGE_KEYS.ORDERS, sorted, false);
          callback(sorted);
        },
        (error) => {
          console.warn('Firestore all orders fallback:', error.message);
          const local = getLocalData(LOCAL_STORAGE_KEYS.ORDERS, []);
          const sorted = [...local].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          callback(sorted);
        }
      );
      return () => {
        try {
          unsub();
        } catch {}
      };
    } catch (err) {
      console.warn('Failed to subscribe all orders:', err);
    }
  }

  // Local fallback
  const emit = () => {
    const orders = getLocalData(LOCAL_STORAGE_KEYS.ORDERS, []);
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(sorted);
  };
  emit();
  const listener = () => emit();
  window.addEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.ORDERS}`, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.ORDERS}`, listener);
    window.removeEventListener('storage', listener);
  };
}

export async function updateOrderStatus(orderId, status) {
  const current = getLocalData(LOCAL_STORAGE_KEYS.ORDERS, []);
  const updated = current.map((o) =>
    o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o
  );
  setLocalData(LOCAL_STORAGE_KEYS.ORDERS, updated, true);

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'orders', orderId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, {
          status,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Check if there is a document with field id === orderId (legacy orders)
        const q = query(collection(db, 'orders'), where('id', '==', orderId));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          for (const d of querySnap.docs) {
            await updateDoc(doc(db, 'orders', d.id), {
              status,
              updatedAt: serverTimestamp(),
            });
          }
        } else {
          // If no doc found, create/merge the document with setDoc
          await setDoc(
            docRef,
            {
              id: orderId,
              status,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      }
    } catch (e) {
      console.error('❌ Firestore updateOrderStatus error:', e);
      throw e;
    }
  }
}

// ==========================================
// 4. WAITER CALLS SERVICE
// ==========================================

export async function createWaiterCall(tableId, tableNumber, reason = 'Assistance Needed') {
  const callId = `call_${Date.now()}`;
  const payload = sanitizeForFirestore({
    id: callId,
    tableId: tableId || 'table_01',
    tableNumber: Number(tableNumber) || 1,
    reason: reason || 'Assistance Needed',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  const current = getLocalData(LOCAL_STORAGE_KEYS.WAITER_CALLS, []);
  setLocalData(LOCAL_STORAGE_KEYS.WAITER_CALLS, [payload, ...current.filter((c) => c.id !== callId)], true);

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'waiterCalls', callId);
      await setDoc(docRef, {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return callId;
    } catch (e) {
      console.error('❌ Firestore createWaiterCall error:', e);
      throw e;
    }
  }
  return callId;
}

export function subscribeActiveWaiterCalls(callback) {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'waiterCalls'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const calls = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          const pending = calls
            .filter((c) => c.status === 'pending')
            .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
          callback(pending);
        },
        (err) => {
          console.warn('Firestore waiter calls fallback:', err.message);
          const local = getLocalData(LOCAL_STORAGE_KEYS.WAITER_CALLS, []);
          callback(local.filter((c) => c.status === 'pending'));
        }
      );
      return () => {
        try {
          unsub();
        } catch {}
      };
    } catch (err) {
      console.warn('Failed to subscribe waiter calls:', err);
    }
  }

  // Local fallback
  const emit = () => {
    const calls = getLocalData(LOCAL_STORAGE_KEYS.WAITER_CALLS, []);
    callback(calls.filter((c) => c.status === 'pending'));
  };
  emit();
  const listener = () => emit();
  window.addEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.WAITER_CALLS}`, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(`gourmet_store_${LOCAL_STORAGE_KEYS.WAITER_CALLS}`, listener);
    window.removeEventListener('storage', listener);
  };
}

export async function resolveWaiterCall(callId) {
  const current = getLocalData(LOCAL_STORAGE_KEYS.WAITER_CALLS, []);
  const updated = current.map((c) =>
    c.id === callId ? { ...c, status: 'resolved', resolvedAt: new Date().toISOString() } : c
  );
  setLocalData(LOCAL_STORAGE_KEYS.WAITER_CALLS, updated, true);

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'waiterCalls', callId);
      await setDoc(
        docRef,
        { status: 'resolved', resolvedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.error('❌ Firestore resolveWaiterCall error:', e);
      throw e;
    }
  }
}

// ==========================================
// 5. SEED DATA TO FIRESTORE
// ==========================================

export async function seedFirestoreDatabase() {
  initializeMockStorage();

  if (!isFirebaseConfigured || !db) {
    return { success: true, count: INITIAL_MENU_ITEMS.length, mode: 'local' };
  }

  let seededItems = 0;
  let seededTables = 0;

  try {
    // 1. Seed tables
    for (const table of INITIAL_TABLES) {
      const docRef = doc(db, 'tables', table.id);
      await setDoc(
        docRef,
        sanitizeForFirestore({
          ...table,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
      seededTables++;
    }

    // 2. Seed menu items
    for (const item of INITIAL_MENU_ITEMS) {
      const docRef = doc(db, 'menuItems', item.id);
      await setDoc(
        docRef,
        sanitizeForFirestore({
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
      seededItems++;
    }
  } catch (err) {
    console.error('❌ Firestore seeding error:', err);
    throw err;
  }

  return { success: true, tables: seededTables, items: seededItems, mode: 'firestore' };
}
