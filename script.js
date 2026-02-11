document.getElementById("btn-login").onclick = () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;   // pasword → password

  if (!username || !password) {
    document.getElementById("message").textContent = "Kullanıcı adı ve şifre zorunlu!";
    return;
  }

  const users = getUsers();

  if (!users[username]) {
    document.getElementById("message").textContent = "Böyle bir kullanıcı yok.";
    return;
  }

  if (users[username] !== sha256Simple(password)) {
    document.getElementById("message").textContent = "Şifre yanlış.";
    return;
  }

  setActiveUser(username);
  window.location.href = "home.html";
};

document.getElementById("btn-register").onclick = () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    document.getElementById("message").textContent = "Kullanıcı adı ve şifre zorunlu!";
    return;
  }

  const users = getUsers();

  if (users[username]) {
    document.getElementById("message").textContent = "Bu kullanıcı adı zaten alınmış.";
    return;
  }

  users[username] = sha256Simple(password);
  saveUsers(users);
  setActiveUser(username);
  window.location.href = "home.html";
};

  users[username] = sha256Simple(password); 
  saveUsers(users);
  setActiveUser(username);
  
  alert("Kayıt başarılı! Yönlendiriliyorsunuz...");
  window.location.href = "home.html";
  
  
const STORAGE_KEY_USERS = "flagGame_users";
const STORAGE_KEY_SCORES = "flagGame_scores";
const STORAGE_KEY_ACTIVE = "flagGame_activeUser";

function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || "{}");
}

function setActiveUser(username) {
  localStorage.setItem(STORAGE_KEY_ACTIVE, username);
}

function getActiveUser() {
  return localStorage.getItem(STORAGE_KEY_ACTIVE);
}

function sha256Simple(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(36);
}
function normalize(str) {
  
  return ((str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim());
}

  
function getActiveUser() { // kullanıcı sisteme girmiş mi kontrel eder.
  return localStorage.getItem(STORE_KEY_ACTIVE);
}

function setActiveUser(username) {
  localStorage.setItem(STORE_KEY_ACTIVE, username);
}

function logout() {
  localStorage.removeItem(STORE_KEY_ACTIVE);
  window.location.href = "index.html";
}

const user = getActiveUser();
if (!user) {
  window.location.href = "index.html";
}
document.getElementById("username").textContent = user;

document.getElementById("btn-start").onclick = () => {
  
  const selectDifficulty = document.getElementById("select-difficulty").value;
  localStorage.setItem("gameDifficulty", selectDifficulty);

  window.location.href = "game.html";
};

document.getElemenetById("btn-scoreboard").onclick = () => {
  window.location.href = "scoreboard.html";
};
document.getElementById("btn-logout").onclick = () => {
  logout();
};

let countries = [];
let currentQuestionIndex = 0;
let score = 0;
let questions = [];


async function loadCountries() {
  try {
    const res = await fetch("https://restcountries.com/v3.1/all?fields=name,capital,population,flags");
    const data = await res.json();
    

    countries = data.map(c => ({
      name: c.name.common,
      capital: c.capital ? c.capital[0] : "Yok",
      population: c.population,
      flag: c.flags.png
    }));
    
    startGame();
  } catch (err) {
    console.error("Veri çekilemedi:", err);
  }
}

function checkAnswers() {
  const q = questions[currentQuestionIndex];
  

  const nameOk = normalize(document.getElementById("country").value) === normalize(q.name);
  const capitalOk = normalize(document.getElementById("capital").value) === normalize(q.capital);
  
  
  const userPop = parseInt(document.getElementById("population").value);
  const diff = Math.abs(userPop - q.population);
  const popOk = diff <= (q.population * 0.10);

  let points = 0;
  if (nameOk) points += 40;    
  if (capitalOk) points += 30; 
  if (popOk) points += 30;    

  score += points;
 
  document.getElementById("result").innerHTML = `+${points} Puan! Doğru cevap: ${q.name}`;
  document.getElementById("submit").style.display = "none";
  document.getElementById("next").style.display = "block";
}

let timeLeft = 30;
let timerInterval;



function handleTimeOut() {
  document.getElementById("result").innerHTML = `<div class="result wrong">Süre Bitti!</div>`;
 
  document.getElementById("submit").style.display = "none";
  document.getElementById("next").style.display = "block";
  
  
}


function showQuestion() {

  startTimer(); 
}

function renderScores() {
  const user = getActiveUser(); //
  if (!user) {
    window.location.href = "index.html"; //
    return;
  }

  const allScores = getScores(); //
  const scores = allScores[user] || []; //

  const recentBody = document.getElementById("recent-scores");
  recentBody.innerHTML = "";
  

  const recentTen = scores.slice(-10).reverse(); 
  
  recentTen.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${new Date(item.date).toLocaleString("tr-TR")}</td>
      <td>${item.difficulty}</td>
      <td><strong>${item.score}</strong></td>
    `;
    recentBody.appendChild(row);
  });


  const bestBody = document.getElementById("best-scores");
  bestBody.innerHTML = "";
  
  
  const sortedBest = [...scores].sort((a,b) => b.score - a.score).slice(0,10);
  
  sortedBest.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}.</td>
      <td>${new Date(item.date).toLocaleDateString("tr-TR")}</td>
      <td>${item.difficulty}</td>
      <td><strong>${item.score}</strong></td>
    `;
    bestBody.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderScores();

 
  document.getElementById("btn-home").onclick = () => {
    window.location.href = "home.html";
  };
});