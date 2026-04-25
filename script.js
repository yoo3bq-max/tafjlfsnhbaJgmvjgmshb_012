<script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
    import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

    // --- Firebase Configuration ---
    const firebaseConfig = {
        apiKey: "AIzaSyAkmxcg0LykyxIlBnvJQIiiPI_H8Dy_koM",
        authDomain: "universal-8d7eb.firebaseapp.com",
        projectId: "universal-8d7eb",
        storageBucket: "universal-8d7eb.firebasestorage.app",
        messagingSenderId: "242890668753",
        appId: "1:242890668753:web:a94bf7f0eecf6f4efda3f0",
        measurementId: "G-KHLCH9QYEZ"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const appId = 'cosmic-message-app';

    let user = null;
    let messages = [];
    let time = 0;
    let audioCtx = null;

    // --- ID生成 (ユーザーごとに変わるように改良) ---
    const generateId = (uid) => {
        const prefixes = ["NOVA", "VOYAGER", "ORION", "STELLAR", "ECHO"];
        const index = uid ? uid.charCodeAt(0) % prefixes.length : 0;
        const suffix = uid ? uid.substring(0, 4).toUpperCase() : "XXXX";
        return `${prefixes[index]}-${suffix}`;
    };

    // --- Auth ---
    signInAnonymously(auth).catch(console.error);
    onAuthStateChanged(auth, u => user = u);

    // --- Firestore リアルタイム監視 ---
    const msgCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    onSnapshot(msgCol, (snapshot) => {
        document.getElementById('visitor-count').innerText = `ACTIVE_NODES: ${snapshot.size + 1069}`;
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
                const data = change.doc.data();
                const text = data.text || "";

                // ★絵文字が出るように判定を追加
                const hasSakana = text.includes('サカナクション');
                const hasOOR = text.includes('ワンオク') || text.includes('1069');

                messages.push({
                    id: change.doc.id,
                    text: text,
                    userId: data.userId,
                    x: 20 + Math.random() * 60,
                    y: 105,
                    v: hasOOR ? -0.08 : (-0.015 - Math.random() * 0.01), // OORは速く上昇
                    phase: Math.random() * Math.PI * 2,
                    orbitPhase: Math.random() * Math.PI * 2, // 絵文字回転用
                    opacity: 0,
                    hasSakana,
                    hasOOR,
                    element: null
                });
            }
        });
    });

    // --- アニメーションループ ---
    function animate() {
        time += 0.005;
        const container = document.getElementById('message-stream');
        const bg = document.getElementById('bg-container');

        if (bg) {
            bg.style.transform = `scale(${1.25 + Math.sin(time * 0.02) * 0.03}) translate(${Math.cos(time * 0.04) * 15}px, ${Math.sin(time * 0.04) * 8}px)`;
        }

        messages.forEach((msg) => {
            msg.y += msg.v;
            const dX = msg.x + Math.sin(time * 0.2 + msg.phase) * 3;
            const dY = msg.y + Math.cos(time * 0.2 + msg.phase) * 2;

            if (msg.y > 10) msg.opacity = Math.min(1, msg.opacity + 0.02);
            if (msg.y < 5) msg.opacity = Math.max(0, msg.opacity - 0.02);

            if (!msg.element) {
                msg.element = document.createElement('div');
                msg.element.className = 'message-node';
                
                // ★絵文字を表示するためのHTMLを組み立て
                let decoHTML = '';
                if (msg.hasSakana) decoHTML = `<div class="deco-emoji">🐡</div>`;
                if (msg.hasOOR) decoHTML = `<div class="deco-emoji">🌎</div>`;

                msg.element.innerHTML = `
                    ${decoHTML}
                    <div class="meta-info">
                        <span style="font-size:6px; font-family:monospace; color:cyan;">${generateId(msg.userId)}</span>
                    </div>
                    <div class="message-bubble">${msg.text}</div>
                `;
                container.appendChild(msg.element);
            }

            // ★絵文字をくるくる回すアニメーション
            const decoEl = msg.element.querySelector('.deco-emoji');
            if (decoEl) {
                const ox = Math.cos(time * 2 + msg.orbitPhase) * 55;
                const oy = Math.sin(time * 1.5 + msg.orbitPhase) * 18;
                decoEl.style.transform = `translate(${ox}px, ${oy}px)`;
            }

            msg.element.style.left = dX + '%';
            msg.element.style.top = dY + '%';
            msg.element.style.opacity = msg.opacity;
        });

        messages = messages.filter(m => {
            if (m.y < -15) {
                if (m.element) m.element.remove();
                return false;
            }
            return true;
        });
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // --- 送信処理 (即座に入力を消すように修正) ---
    const form = document.getElementById('input-form');
    const input = document.getElementById('message-input');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text || !user) return;

        input.value = ''; // ★送信ボタンを押した瞬間に消す！

        try {
            await addDoc(msgCol, {
                text: text,
                userId: user.uid,
                createdAt: serverTimestamp()
            });
        } catch (err) {
            console.error(err);
            input.value = text; // 失敗時のみ戻す
        }
    };
</script>