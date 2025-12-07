// Configuration
const FILE_EN = './quran_en.json'; // Source: risan (Nested structure)
const FILE_FA = './quran_fa.json'; // Source: fawazahmed0 (Flat structure)

let quranData = [];
let userSettings = {
    mode: localStorage.getItem('mode') || 'random',
    lang: localStorage.getItem('lang') || 'en',
    lastIndex: parseInt(localStorage.getItem('lastIndex')) || 0
};

// --- Initialization ---
async function initApp() {
    updateUIState();
    const loader = document.getElementById('loader');
    const loadingText = document.getElementById('loadingText');

    try {
        // Fetch local JSON files
        const [resEn, resFa] = await Promise.all([
            fetch(FILE_EN),
            fetch(FILE_FA)
        ]);

        if (!resEn.ok || !resFa.ok) {
            throw new Error("Could not load local JSON files.");
        }

        const dataEn = await resEn.json(); // Array of Surahs
        const dataFaRaw = await resFa.json(); // Object { quran: [...] }

        // Handle inconsistent structure from fawazahmed0
        // Sometimes it returns { quran: [...] }, sometimes just [...]
        const flatPersian = dataFaRaw.quran ? dataFaRaw.quran : dataFaRaw;

        loadingText.innerText = "Merging Data...";

        // --- SMART MERGE LOGIC ---
        // dataEn is Nested (Surah -> Verses)
        // flatPersian is Flat (Verse, Verse, Verse...)
        
        quranData = [];
        let faIndex = 0; // Pointer for the Persian array

        dataEn.forEach((surah) => {
            surah.verses.forEach((verse) => {
                
                // Safety: Get Persian verse at current pointer
                // We assume the order is identical (1:1, 1:2...)
                let persianText = "";
                
                if (flatPersian[faIndex]) {
                    // distinct check to ensure we don't desync
                    // fawazahmed0 uses 'chapter' and 'verse', risan uses 'id' (surah) and 'id' (verse)
                    // We trust the sequence, but if you want strict checking:
                    // if (flatPersian[faIndex].chapter == surah.id && flatPersian[faIndex].verse == verse.id)
                    persianText = flatPersian[faIndex].text;
                    faIndex++;
                }

                quranData.push({
                    surah: surah.name,          // Arabic Name
                    surah_num: surah.id,
                    ayah: verse.id,
                    arabic: verse.text,
                    en: verse.translation,      // English
                    fa: persianText             // Persian
                });
            });
        });

        console.log(`Successfully loaded ${quranData.length} verses.`);
        
        // Remove Loader
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);

        initFeed();

    } catch (e) {
        console.error(e);
        loadingText.innerHTML = "Error Loading Data.<br>1. Download files.<br>2. Rename Persian file to quran_fa.json.<br>3. Check console.";
    }
}

// --- Feed Logic ---
function initFeed() {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';
    // Load initial buffer
    for(let i=0; i<3; i++) appendVerse();
}

function getNextVerse() {
    let index;
    if (userSettings.mode === 'random') {
        index = Math.floor(Math.random() * quranData.length);
    } else {
        index = userSettings.lastIndex;
        userSettings.lastIndex = (userSettings.lastIndex + 1) % quranData.length;
        localStorage.setItem('lastIndex', userSettings.lastIndex);
    }
    return quranData[index];
}

// --- Rendering ---
function appendVerse() {
    if (quranData.length === 0) return;
    
    const data = getNextVerse();
    const card = document.createElement('div');
    card.className = 'verse-card';

    card.appendChild(buildContent(data));
    document.getElementById('feed').appendChild(card);
}

function buildContent(data) {
    let text = "";
    let isRTL = false;
    let langClass = "";

    // Language logic
    if (userSettings.lang === 'en') {
        text = data.en;
    } else if (userSettings.lang === 'fa') {
        text = data.fa;
        isRTL = true;
        langClass = "persian-font";
    }

    // Determine layout: standard vs carousel
    // If arabic is super long OR translation is super long
    const isLong = data.arabic.length > 250 || (text && text.length > 250);

    const wrapper = document.createElement('div');
    wrapper.className = 'card-content-wrapper';

    const metaHtml = `
        <div class="verse-meta">
            <span>${data.surah_num}:${data.ayah}</span>
            <span class="surah-badge">${data.surah}</span>
        </div>
    `;

    if (isLong) {
        // Carousel Mode
        const arChunks = chunkString(data.arabic, 180);
        let slides = '';

        // Arabic Slides
        arChunks.forEach((chunk, i) => {
            slides += `
            <div class="h-slide">
                <div class="arabic-text">${chunk}</div>
                <div class="slide-hint">${i+1}/${arChunks.length + (text ? 1 : 0)}</div>
            </div>`;
        });

        // Translation Slide
        if (userSettings.lang !== 'none') {
            slides += `
            <div class="h-slide">
                <div class="trans-text ${isRTL ? 'rtl' : ''} ${langClass}">${text}</div>
                <div class="slide-hint">Translation</div>
            </div>`;
        }

        wrapper.innerHTML = `
            <div class="h-scroll-container">
                ${slides}
                <div class="swipe-indicator">Swipe ↔</div>
            </div>
            ${metaHtml}
        `;
    } else {
        // Standard Mode
        wrapper.innerHTML = `
            <div class="static-slide">
                <div class="arabic-text">${data.arabic}</div>
                ${userSettings.lang !== 'none' 
                    ? `<div class="trans-text ${isRTL ? 'rtl' : ''} ${langClass}">${text}</div>` 
                    : ''}
            </div>
            ${metaHtml}
        `;
    }

    return wrapper;
}

// Utility: Split text into chunks without breaking words
function chunkString(str, len) {
    const words = str.split(' ');
    let chunks = [];
    let current = "";
    words.forEach(word => {
        if ((current + word).length > len) {
            chunks.push(current);
            current = "";
        }
        current += word + " ";
    });
    if(current) chunks.push(current);
    return chunks;
}

// --- Settings Functions ---
window.openSettings = () => document.getElementById('settingsModal').classList.add('open');
window.closeSettings = () => document.getElementById('settingsModal').classList.remove('open');

window.setMode = (mode) => {
    userSettings.mode = mode;
    localStorage.setItem('mode', mode);
    updateUIState();
    initFeed(); // Refresh feed
};

window.setLanguage = (lang) => {
    userSettings.lang = lang;
    localStorage.setItem('lang', lang);
    initFeed();
};

window.resetProgress = () => {
    userSettings.lastIndex = 0;
    localStorage.setItem('lastIndex', 0);
    alert("Progress reset to start.");
};

function updateUIState() {
    const bR = document.getElementById('btn-random');
    const bO = document.getElementById('btn-order');
    if(userSettings.mode==='random') { bR.classList.add('active'); bO.classList.remove('active'); }
    else { bR.classList.remove('active'); bO.classList.add('active'); }
    document.getElementById('langSelect').value = userSettings.lang;
}

// --- Infinite Scroll ---
const feed = document.getElementById('feed');
feed.addEventListener('scroll', () => {
    if(feed.scrollTop + feed.clientHeight >= feed.scrollHeight - 600) {
        appendVerse();
    }
});

// --- Service Worker (Offline) ---
if ('serviceWorker' in navigator) {
    // Only register if we are on http/https (GitHub Pages)
    if (window.location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('sw.js');
    }
}

// Start
initApp();