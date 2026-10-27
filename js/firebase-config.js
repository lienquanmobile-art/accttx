import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, push, onValue, runTransaction }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyATKLs3Wvd1LCsLRzvgVP0Ag8c7sngs8b4",
  authDomain: "accttxlienquan.firebaseapp.com",
  databaseURL: "https://accttxlienquan-default-rtdb.firebaseio.com",
  projectId: "accttxlienquan",
  storageBucket: "accttxlienquan.firebasestorage.app",
  messagingSenderId: "556073989134",
  appId: "1:556073989134:web:4a891fb3ab5ad299a0785f"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, get, set, update, remove, push, onValue, runTransaction };
