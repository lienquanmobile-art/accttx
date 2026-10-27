import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, push, onValue, runTransaction }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyATKLs3Wvd1LCsLRzvgVP0Ag8c7sngs8b4",
  authDomain: "accttxlienquan.firebaseapp.com",
  // ⚠️ QUAN TRỌNG: kiểm tra đúng URL trong Firebase Console → Realtime Database
  databaseURL: "https://accttxlienquan-default-rtdb.firebaseio.com",
  projectId: "accttxlienquan",
  storageBucket: "accttxlienquan.firebasestorage.app",
  messagingSenderId: "556073989134",
  appId: "1:556073989134:web:4a891fb3ab5ad299a0785f"
};

export const app = initializeApp(firebaseConfig);

let dbInstance;
try {
  dbInstance = getDatabase(app);
} catch (e) {
  console.error("❌ Không khởi tạo được Realtime Database:", e);
  dbInstance = null;
}
export const db = dbInstance;

export { ref, get, set, update, remove, push, onValue, runTransaction };
