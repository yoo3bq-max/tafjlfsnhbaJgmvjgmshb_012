import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- Firebase Configuration (★ご自身のものに差し替え) ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'cosmic-message-app';

let user = null;
let messages = [];
let time = 0;

// Cosmic ID 生成 (ユーザーIDごとに異なる名前を出す)
const generateCosmicId = (uid) => {
    if(!uid) return "UNKNOWN";
    const prefixes = ["NOVA", "VOYAGER", "ORION", "ZODIAC", "STELLAR", "ECHO"];
    const index = uid.charCodeAt(0) % prefixes.length;
    const suffix = uid.substring(0, 4).toUpperCase();
    return `${prefixes[index]}-${suffix}`;
};

// Auth
signInAnonymously(auth);
onAuthStateChanged(auth, u => user = u);

// Firestore 監視
const msgCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
onSnapshot(msgCol, (snapshot) => {
    snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
            const data = change.doc.data();
            const text = data.text || "";
            
            // ★判定ロジック
            const hasSakana = text.includes('サカナクション');
            const hasOOR = text.includes('ワンオク') || text.includes('ONE OK ROCK') || text.includes('1069');

            messages.push({
                id: change.doc.id,
                text: text,
                userId: data.userId || "anon",
                currentX: 20 + Math.random() * 60,
                currentY: 105,
                floatVelocity: hasOOR ? -0.08 : (-0.015 - Math.random() * 0.01),
                phase: Math.random() * Math.PI * 2,
                orbitPhase: Math.random() * Math.PI * 2,
                opacity: 0,
                hasSakana,
                hasOOR,
                element: null
            });
        }
    });
});

// アニメーション
function animate() {
    time += 0.005;
    const container = document.getElementById('message-stream');

    messages.forEach((msg) => {
        msg.currentY += msg.floatVelocity;
        const dX = msg.currentX + Math.sin(time * 0.2 + msg.phase) * 4;
        const dY = msg.currentY + Math.cos(time * 0.2 + msg.phase) * 3;

        if (msg.currentY > 10) msg.opacity = Math.min(1, msg.opacity + 0.02);
        if (msg.currentY < 5) msg.opacity = Math.max(0, msg.opacity - 0.02);

        // 要素作成（ここで絵文字やIDを流し込む）
        if (!msg.element) {
            msg.element = document.createElement('div');
            msg.element.className = 'message-node';
            
            let deco = '';
            if (msg.hasSakana) deco = `<div class="deco-emoji">🐡</div>`;
            if (msg.hasOOR) deco = `<div class="deco-emoji">🌎</div>`;

            msg.element.innerHTML = `
                ${deco}
                <div class="meta-info">
                    <span class="cosmic-id">${generateCosmicId(msg.userId)}</span>
                </div>
                <div class="message-bubble">${msg.text}</div>
            `;
            container.appendChild(msg.element);
        }

        // 絵文字を回す
        const decoEl = msg.element.querySelector('.deco-emoji');
        if (decoEl) {
            const ox = Math.cos(time * 2 + msg.orbitPhase) * 60;
            const oy = Math.sin(time * 1.5 + msg.orbitPhase) * 20;
            decoEl.style.transform = `translate(${ox}px, ${oy}px)`;
        }

        msg.element.style.left = `${dX}%`;
        msg.element.style.top = `${dY}%`;
        msg.element.style.opacity = msg.opacity;
    });

    messages = messages.filter(m => {
        if (m.currentY < -20) {
            if (m.element) m.element.remove();
            return false;
        }
        return true;
    });
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// --- 送信処理 (★重要：ここで入力をクリアする) ---
const form = document.getElementById('input-form');
const input = document.getElementById('message-input');

form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !user) return;

    // 即座に消す
    input.value = '';

    try {
        await addDoc(msgCol, {
            text: text,
            userId: user.uid,
            createdAt: serverTimestamp()
        });
    } catch (err) {
        console.error(err);
        input.value = text; // 失敗したら戻す
    }
};