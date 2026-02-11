// --- KONFİGÜRASYON ---
const STORAGE_KEY_USERS = "flagGame_users";
const STORAGE_KEY_SCORES = "flagGame_scores";
const STORAGE_KEY_ACTIVE = "flagGame_activeUser";

// Yardımcılar
const getUsers = () => JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || "{}");
const saveUsers = (users) => localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
const getActiveUser = () => localStorage.getItem(STORAGE_KEY_ACTIVE);
const setActiveUser = (user) => localStorage.setItem(STORAGE_KEY_ACTIVE, user);

// Şifre Hashleme
function sha256Simple(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(36);
}

// Normalizasyon
function normalize(str) {
    return (str || "").trim().toLowerCase()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
}

// --- SAYFA KONTROLÜ ---
document.addEventListener("DOMContentLoaded", () => {
    const page = window.location.pathname.split("/").pop();
    const user = getActiveUser();

    if (!user && page !== "index.html" && page !== "") {
        window.location.href = "index.html";
        return;
    }

    if (page === "index.html" || page === "") initLogin();
    if (page === "home.html") initHome(user);
    if (page === "game.html") initGame();
    if (page === "scoreboard.html") initScoreboard();
});

// --- GİRİŞ MANTIĞI ---
function initLogin() {
    const userInp = document.getElementById("username");
    const passInp = document.getElementById("password");
    const msg = document.getElementById("message");

    document.getElementById("btn-register").onclick = () => {
        const users = getUsers();
        if (userInp.value.length < 3) return msg.textContent = "Kullanıcı adı çok kısa!";
        if (users[userInp.value]) return msg.textContent = "Bu kullanıcı zaten var!";
        users[userInp.value] = sha256Simple(passInp.value);
        saveUsers(users);
        setActiveUser(userInp.value);
        window.location.href = "home.html";
    };

    document.getElementById("btn-login").onclick = () => {
        const users = getUsers();
        if (users[userInp.value] === sha256Simple(passInp.value)) {
            setActiveUser(userInp.value);
            window.location.href = "home.html";
        } else msg.textContent = "Hatalı kullanıcı adı veya şifre!";
    };
}

// --- ANA SAYFA MANTIĞI ---
function initHome(currentUser) {
    document.getElementById("display-username").textContent = currentUser;
    document.getElementById("btn-start").onclick = () => {
        localStorage.setItem("flagGame_difficulty", document.getElementById("difficulty").value);
        window.location.href = "game.html";
    };
    document.getElementById("btn-scoreboard").onclick = () => window.location.href = "scoreboard.html";
    document.getElementById("btn-logout").onclick = () => {
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
        window.location.href = "index.html";
    };
}

// --- OYUN MOTORU ---
let gameData = { questions: [], currentIndex: 0, score: 0, timer: null, timeLeft: 30 };

async function initGame() {
    const difficulty = localStorage.getItem("flagGame_difficulty") || "medium";
    try {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,capital,population,flags");
        const data = await res.json();
        const all = data.map(c => ({
            name: c.name.common,
            cap: c.capital ? c.capital[0] : "Yok",
            pop: c.population,
            flag: c.flags.png
        }));

        let filtered = all;
        if (difficulty === "easy") filtered = all.filter(c => c.pop > 50000000);
        else if (difficulty === "hard") filtered = all.filter(c => c.pop < 1000000);

        gameData.questions = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
        setupGameEvents();
        showQuestion();
    } catch (err) { console.error("API hatası:", err); }
}

function setupGameEvents() {
    document.getElementById("btn-submit").onclick = () => checkAnswers(false);
    document.getElementById("btn-next").onclick = () => {
        gameData.currentIndex++;
        if (gameData.currentIndex < 10) showQuestion();
        else finishGame();
    };
}

function showQuestion() {
    const q = gameData.questions[gameData.currentIndex];
    document.getElementById("question-number").textContent = gameData.currentIndex + 1;
    document.getElementById("progress-bar").style.width = `${(gameData.currentIndex + 1) * 10}%`;
    document.getElementById("flag").src = q.flag;
    document.getElementById("result-message").innerHTML = "";
    
    // Inputları temizle
    ["input-country", "input-capital", "input-population"].forEach(id => {
        const el = document.getElementById(id);
        el.value = "";
        el.disabled = false;
    });

    document.getElementById("btn-submit").style.display = "block";
    document.getElementById("btn-next").style.display = "none";
    startTimer();
}

function startTimer() {
    clearInterval(gameData.timer);
    gameData.timeLeft = 30;
    const display = document.getElementById("timer-display");
    gameData.timer = setInterval(() => {
        gameData.timeLeft--;
        display.textContent = gameData.timeLeft;
        if (gameData.timeLeft <= 0) { clearInterval(gameData.timer); checkAnswers(true); }
    }, 1000);
}

function checkAnswers(isTimeout = false) {
    clearInterval(gameData.timer);
    const q = gameData.questions[gameData.currentIndex];
    
    const uName = document.getElementById("input-country").value;
    const uCap = document.getElementById("input-capital").value;
    const uPop = parseInt(document.getElementById("input-population").value) || 0;

    const nOk = normalize(uName) === normalize(q.name);
    const cOk = normalize(uCap) === normalize(q.cap);
    const pOk = Math.abs(uPop - q.pop) <= q.pop * 0.1;

    let p = 0;
    if (!isTimeout) {
        if (nOk) p += 40;
        if (cOk) p += 30;
        if (pOk) p += 30;
    }
    gameData.score += p;
    document.getElementById("total-score-display").textContent = `Puan: ${gameData.score}`;

    // Cevap Paneli (İstediğin Temiz Görünüm)
    const resultMsg = document.getElementById("result-message");
    resultMsg.innerHTML = `
        <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin-top: 10px; text-align: left;">
            <h4 style="color: ${isTimeout ? '#f72585' : '#4cc9f0'}; margin-bottom: 8px;">
                ${isTimeout ? '⌛ Süre Bitti!' : '🎯 Soru Tamamlandı!'} (+${p} Puan)
            </h4>
            <div style="font-size: 0.9rem; line-height: 1.6;">
                <p><strong>🌍 Ülke:</strong> ${q.name} ${nOk ? '✔️' : '❌'}</p>
                <p><strong>🏛️ Başkent:</strong> ${q.cap} ${cOk ? '✔️' : '❌'}</p>
                <p><strong>👥 Nüfus:</strong> ${q.pop.toLocaleString()} ${pOk ? '✔️' : '❌'}</p>
            </div>
        </div>
    `;

    ["input-country", "input-capital", "input-population"].forEach(id => document.getElementById(id).disabled = true);
    document.getElementById("btn-submit").style.display = "none";
    document.getElementById("btn-next").style.display = "block";
}

function finishGame() {
    const user = getActiveUser();
    const diff = localStorage.getItem("flagGame_difficulty") || "medium";
    const allScores = JSON.parse(localStorage.getItem(STORAGE_KEY_SCORES) || "{}");
    if (!allScores[user]) allScores[user] = [];
    allScores[user].push({ date: new Date().toISOString(), difficulty: diff, score: gameData.score });
    localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(allScores));
    window.location.href = "scoreboard.html";
}

// --- SKOR TABLOSU ---
function initScoreboard() {
    const user = getActiveUser();
    const scores = (JSON.parse(localStorage.getItem(STORAGE_KEY_SCORES) || "{}"))[user] || [];
    
    const recentBody = document.getElementById("recent-scores");
    [...scores].reverse().slice(0, 10).forEach(s => {
        recentBody.innerHTML += `<tr><td>${new Date(s.date).toLocaleDateString()}</td><td>${s.difficulty}</td><td>${s.score}</td></tr>`;
    });

    const bestBody = document.getElementById("best-scores");
    [...scores].sort((a, b) => b.score - a.score).slice(0, 10).forEach((s, i) => {
        bestBody.innerHTML += `<tr><td>${i+1}</td><td>${new Date(s.date).toLocaleDateString()}</td><td>${s.difficulty}</td><td>${s.score}</td></tr>`;
    });

    document.getElementById("btn-home").onclick = () => window.location.href = "home.html";
}

function setupGameEvents() {
    document.getElementById("btn-submit").onclick = checkAnswers;
    document.getElementById("btn-next").onclick = () => {
        gameData.currentIndex++;
        if (gameData.currentIndex < 10) {
            showQuestion();
        } else {
            finishGame();
        }
    };
}

function showQuestion() {
    const q = gameData.questions[gameData.currentIndex];
    
    // UI Güncelle
    document.getElementById("question-number").textContent = gameData.currentIndex + 1;
    document.getElementById("progress-bar").style.width = `${(gameData.currentIndex + 1) * 10}%`;
    document.getElementById("flag").src = q.flag;
    document.getElementById("result-message").textContent = "";
    
    // Inputları temizle
    document.getElementById("input-country").value = "";
    document.getElementById("input-capital").value = "";
    document.getElementById("input-population").value = "";
    
    document.getElementById("btn-submit").style.display = "block";
    document.getElementById("btn-next").style.display = "none";
    
    startTimer();
}

function startTimer() {
    clearInterval(gameData.timer);
    gameData.timeLeft = 30;
    const display = document.getElementById("timer-display");
    display.textContent = gameData.timeLeft;
    display.style.color = "white";

    gameData.timer = setInterval(() => {
        gameData.timeLeft--;
        display.textContent = gameData.timeLeft;
        
        if (gameData.timeLeft <= 10) display.style.color = "var(--danger)";
        if (gameData.timeLeft <= 0) {
            clearInterval(gameData.timer);
            checkAnswers(true); // Süre biterse zorla kontrol et
        }
    }, 1000);
}

function checkAnswers(isTimeout = false) {
    clearInterval(gameData.timer);
    const q = gameData.questions[gameData.currentIndex];
    const userCountry = normalize(document.getElementById("input-country").value);
    const userCapital = normalize(document.getElementById("input-capital").value);
    const userPop = parseInt(document.getElementById("input-population").value) || 0;

    let points = 0;
    if (!isTimeout) {
        if (userCountry === normalize(q.name)) points += 40;
        if (userCapital === normalize(q.capital)) points += 30;
        
        const popDiff = Math.abs(userPop - q.population);
        if (popDiff <= q.population * 0.1) points += 30; // %10 sapma payı
    }

    gameData.score += points;
    document.getElementById("total-score-display").textContent = `Puan: ${gameData.score}`;
    document.getElementById("result-message").innerHTML = isTimeout 
        ? `<span style="color:var(--danger)">Süre Bitti! Cevap: ${q.name}</span>`
        : `Kazandığın: +${points} Puan! (Doğru: ${q.name})`;

    document.getElementById("btn-submit").style.display = "none";
    document.getElementById("btn-next").style.display = "block";
}
function check(isTimeout = false) {
    clearInterval(state.timer);
    const q = state.questions[state.idx];
    
    // Değerleri al ve karşılaştır
    const userCountry = document.getElementById("in-name").value;
    const userCapital = document.getElementById("in-capital").value;
    const userPop = parseInt(document.getElementById("in-pop").value) || 0;

    const nOk = norm(userCountry) === norm(q.name);
    const cOk = norm(userCapital) === norm(q.cap);
    const pOk = Math.abs(userPop - q.pop) <= q.pop * 0.1;

    let p = 0;
    if(!isTimeout) {
        if(nOk) p += 40;
        if(cOk) p += 30;
        if(pOk) p += 30;
    }
    state.score += p;
    
    document.getElementById("current-score").textContent = `Puan: ${state.score}`;

    // Geri bildirim alanını temiz bir tablo/liste formuna çevirelim
    const feedbackEl = document.getElementById("feedback");
    feedbackEl.innerHTML = `
        <div class="answer-card" style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin-top: 10px; text-align: left;">
            <h4 style="color: ${isTimeout ? '#f72585' : '#4cc9f0'}; margin-bottom: 10px;">
                ${isTimeout ? '⏳ Süre Bitti!' : (p > 0 ? '✅ Tebrikler!' : '❌ Yanlış Cevap!')} 
                <span style="float: right;">+${p} Puan</span>
            </h4>
            <div style="font-size: 0.9rem; line-height: 1.6;">
                <p><strong>🌍 Ülke:</strong> ${q.name} ${nOk ? '✔️' : ''}</p>
                <p><strong>🏛️ Başkent:</strong> ${q.cap} ${cOk ? '✔️' : ''}</p>
                <p><strong>👥 Nüfus:</strong> ${q.pop.toLocaleString()} ${pOk ? '✔️' : ''}</p>
            </div>
        </div>
    `;

    document.getElementById("btn-submit").style.display = "none";
    document.getElementById("btn-next").style.display = "block";
}
function finishGame() {
    const user = getActiveUser();
    const difficulty = localStorage.getItem("flagGame_difficulty") || "medium";
    
    // Skorları Al ve Yeni Skoru Ekle
    const allScores = JSON.parse(localStorage.getItem(STORAGE_KEY_SCORES) || "{}");
    if (!allScores[user]) allScores[user] = [];
    
    allScores[user].push({
        date: new Date().toISOString(),
        difficulty: difficulty,
        score: gameData.score
    });
    
    localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(allScores));
    alert(`Oyun Bitti! Toplam Puanın: ${gameData.score}`);
    window.location.href = "scoreboard.html";
}

// --- SKOR TABLOSU MANTIĞI ---
function initScoreboard() {
    const user = getActiveUser();
    const allScores = JSON.parse(localStorage.getItem(STORAGE_KEY_SCORES) || "{}");
    const userScores = allScores[user] || [];

    // 1. Son 10 Oyun (Tarihe göre yeniden eskiye)
    const recentBody = document.getElementById("recent-scores");
    const recentTen = [...userScores].reverse().slice(0, 10);
    
    renderTable(recentBody, recentTen, false);

    // 2. En İyi 10 Skor (Puana göre yüksekten düşüğe)
    const bestBody = document.getElementById("best-scores");
    const bestTen = [...userScores].sort((a, b) => b.score - a.score).slice(0, 10);
    
    renderTable(bestBody, bestTen, true);

    // Ana Sayfa Butonu
    document.getElementById("btn-home").onclick = () => {
        window.location.href = "home.html";
    };
}

function renderTable(container, data, showRank) {
    container.innerHTML = "";
    
    if (data.length === 0) {
        container.innerHTML = `<tr><td colspan="${showRank ? 4 : 3}">Henüz skor kaydı yok.</td></tr>`;
        return;
    }

    data.forEach((item, index) => {
        const row = document.createElement("tr");
        const dateStr = new Date(item.date).toLocaleDateString("tr-TR");
        
        row.innerHTML = `
            ${showRank ? `<td>${index + 1}</td>` : ""}
            <td>${dateStr}</td>
            <td>${item.difficulty.toUpperCase()}</td>
            <td><strong>${item.score}</strong></td>
        `;
        container.appendChild(row);
    });
}