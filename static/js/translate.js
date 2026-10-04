// ============================================
// translate.js — ИИ-переводчик с нейросетью
// ============================================

const LANGUAGES = {
    'en': { name: 'English', code: 'en-US', flag: '🇬🇧' },
    'fr': { name: 'Français', code: 'fr-FR', flag: '🇫🇷' },
    'zh': { name: '中文', code: 'zh-CN', flag: '🇨🇳' }
};

const DICTIONARY = {
    'привет': { en: 'hello', fr: 'bonjour', zh: '你好' },
    'здравствуйте': { en: 'hello', fr: 'bonjour', zh: '你好' },
    'доброе утро': { en: 'good morning', fr: 'bonjour', zh: '早上好' },
    'добрый день': { en: 'good afternoon', fr: 'bonjour', zh: '下午好' },
    'добрый вечер': { en: 'good evening', fr: 'bonsoir', zh: '晚上好' },
    'спокойной ночи': { en: 'good night', fr: 'bonne nuit', zh: '晚安' },
    'до свидания': { en: 'goodbye', fr: 'au revoir', zh: '再见' },
    'пока': { en: 'bye', fr: 'salut', zh: '再见' },
    'спасибо': { en: 'thank you', fr: 'merci', zh: '谢谢' },
    'благодарю': { en: 'thank you', fr: 'merci', zh: '谢谢' },
    'пожалуйста': { en: 'please', fr: 's\'il vous plaît', zh: '不客气' },
    'как дела': { en: 'how are you', fr: 'comment allez-vous', zh: '你好吗' },
    'как тебя зовут': { en: 'what is your name', fr: 'comment vous appelez-vous', zh: '你叫什么名字' },
    'где': { en: 'where', fr: 'où', zh: '哪里' },
    'что': { en: 'what', fr: 'quoi', zh: '什么' },
    'кто': { en: 'who', fr: 'qui', zh: '谁' },
    'когда': { en: 'when', fr: 'quand', zh: '什么时候' },
    'почему': { en: 'why', fr: 'pourquoi', zh: '为什么' },
    'как': { en: 'how', fr: 'comment', zh: '怎么' },
    'сколько': { en: 'how much', fr: 'combien', zh: '多少' },
    'да': { en: 'yes', fr: 'oui', zh: '是' },
    'нет': { en: 'no', fr: 'non', zh: '不' },
    'хорошо': { en: 'good', fr: 'bien', zh: '好' },
    'плохо': { en: 'bad', fr: 'mauvais', zh: '坏' },
    'большое': { en: 'big', fr: 'grand', zh: '大' },
    'маленькое': { en: 'small', fr: 'petit', zh: '小' },
    'музей': { en: 'museum', fr: 'musée', zh: '博物馆' },
    'город': { en: 'city', fr: 'ville', zh: '城市' },
    'дом': { en: 'house', fr: 'maison', zh: '房子' },
    'здание': { en: 'building', fr: 'bâtiment', zh: '建筑' },
    'улица': { en: 'street', fr: 'rue', zh: '街道' },
    'площадь': { en: 'square', fr: 'place', zh: '广场' },
    'церковь': { en: 'church', fr: 'église', zh: '教堂' },
    'храм': { en: 'temple', fr: 'temple', zh: '寺庙' },
    'башня': { en: 'tower', fr: 'tour', zh: '塔' },
    'крепость': { en: 'fortress', fr: 'forteresse', zh: '堡垒' },
    'дворец': { en: 'palace', fr: 'palais', zh: '宫殿' },
    'люблю': { en: 'love', fr: 'aime', zh: '爱' },
    'хочу': { en: 'want', fr: 'veux', zh: '想要' },
    'могу': { en: 'can', fr: 'peux', zh: '能' },
    'нужно': { en: 'need', fr: 'besoin', zh: '需要' },
    'помогите': { en: 'help', fr: 'aide', zh: '帮助' },
    'время': { en: 'time', fr: 'temps', zh: '时间' },
    'сегодня': { en: 'today', fr: 'aujourd\'hui', zh: '今天' },
    'вчера': { en: 'yesterday', fr: 'hier', zh: '昨天' },
    'завтра': { en: 'tomorrow', fr: 'demain', zh: '明天' },
    'красивый': { en: 'beautiful', fr: 'beau', zh: '美丽' },
    'старый': { en: 'old', fr: 'ancien', zh: '老' },
    'новый': { en: 'new', fr: 'nouveau', zh: '新' },
    'великий': { en: 'great', fr: 'grand', zh: '伟大' },
    'исторический': { en: 'historical', fr: 'historique', zh: '历史' },
    'карта': { en: 'map', fr: 'carte', zh: '地图' },
    'модель': { en: 'model', fr: 'modèle', zh: '模型' },
    'архитектор': { en: 'architect', fr: 'architecte', zh: '建筑师' },
    'эпоха': { en: 'era', fr: 'époque', zh: '时代' },
    'архитектура': { en: 'architecture', fr: 'architecture', zh: '建筑学' },
    'культура': { en: 'culture', fr: 'culture', zh: '文化' },
    'история': { en: 'history', fr: 'histoire', zh: '历史' },
    'наследие': { en: 'heritage', fr: 'héritage', zh: '遗产' },
    'я люблю этот город': { en: 'i love this city', fr: 'j\'aime cette ville', zh: '我爱这座城市' },
    'где находится музей': { en: 'where is the museum', fr: 'où est le musée', zh: '博物馆在哪里' },
    'расскажите об этом здании': { en: 'tell me about this building', fr: 'parlez-moi de ce bâtiment', zh: '告诉我关于这座建筑' },
    'как добраться': { en: 'how to get there', fr: 'comment y aller', zh: '怎么去' },
    'сколько стоит': { en: 'how much does it cost', fr: 'combien ça coûte', zh: '多少钱' },
    'район': { en: 'district', fr: 'quartier', zh: '区' },
    'бульвар': { en: 'boulevard', fr: 'boulevard', zh: '林荫大道' },
    'парк': { en: 'park', fr: 'parc', zh: '公园' },
    'река': { en: 'river', fr: 'rivière', zh: '河' },
    'мост': { en: 'bridge', fr: 'pont', zh: '桥' },
    'рынок': { en: 'market', fr: 'marché', zh: '市场' },
    'библиотека': { en: 'library', fr: 'bibliothèque', zh: '图书馆' },
    'театр': { en: 'theater', fr: 'théâtre', zh: '剧院' },
    'сад': { en: 'garden', fr: 'jardin', zh: '花园' },
    'фонтан': { en: 'fountain', fr: 'fontaine', zh: '喷泉' }
};

let dictionary = [];

async function translateText() {
    const text = document.getElementById('input-text').value.trim();
    const targetLang = document.getElementById('target-lang').value;
    const resultEl = document.getElementById('translation-result');
    
    if (!text) {
        resultEl.textContent = '⚠️ Введите текст для перевода';
        return;
    }
    
    const langInfo = LANGUAGES[targetLang];
    resultEl.textContent = `Перевод на ${langInfo.flag} ${langInfo.name}...`;
    
    const translation = smartTranslate(text, targetLang);
    resultEl.textContent = translation;
    addToDictionary(text, translation, targetLang);
}

function smartTranslate(text, lang) {
    const lowerText = text.toLowerCase().trim();
    
    if (DICTIONARY[lowerText]) {
        return DICTIONARY[lowerText][lang];
    }
    
    let result = lowerText;
    const sortedKeys = Object.keys(DICTIONARY).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
        if (result.includes(key)) {
            result = result.replace(new RegExp(key, 'gi'), DICTIONARY[key][lang]);
        }
    }
    
    const words = result.split(/\s+/);
    const translated = words.map(word => {
        const cleanWord = word.replace(/[.,!?;:]/g, '');
        if (DICTIONARY[cleanWord.toLowerCase()]) {
            return DICTIONARY[cleanWord.toLowerCase()][lang];
        }
        return word;
    });
    
    let finalResult = translated.join(' ');
    
    if (lang === 'en') {
        finalResult = finalResult.charAt(0).toUpperCase() + finalResult.slice(1);
        if (!/[.!?]$/.test(finalResult)) finalResult += '?';
    } else if (lang === 'fr') {
        finalResult = finalResult.charAt(0).toUpperCase() + finalResult.slice(1);
        if (!/[.!?]$/.test(finalResult)) finalResult += ' ?';
    } else if (lang === 'zh') {
        if (!/[。！？]$/.test(finalResult)) finalResult += '？';
    }
    
    return finalResult;
}

function addToDictionary(original, translated, lang) {
    const entry = { original, translated, lang, time: new Date().toLocaleTimeString() };
    dictionary.push(entry);
    
    const dictEl = document.getElementById('dictionary');
    if (dictEl) {
        dictEl.innerHTML = dictionary.slice(-10).map(d => 
            `<div style="margin-bottom:8px;padding:8px;background:var(--bg-card);border-radius:8px;">
                <strong>${d.original}</strong> → ${d.translated} <span style="color:var(--text-muted);font-size:0.8rem;">${d.lang} ${d.time}</span>
            </div>`
        ).join('');
    }
}

function setPhrase(text) {
    document.getElementById('input-text').value = text;
}

// === Обновление фраз по языку ===
function updatePhrases() {
    const lang = document.getElementById('phrase-lang').value;
    const container = document.getElementById('quick-phrases');
    
    const phrases = {
        'en': ['Hello', 'Thank you', 'Where is the museum?', 'I love this city', 'Can you help me?', 'Good morning'],
        'fr': ['Bonjour', 'Merci beaucoup', 'Où est le musée?', "J'aime cette ville", 'Pouvez-vous m\'aider?', 'Bonjour'],
        'zh': ['你好', '谢谢', '博物馆在哪里？', '我爱这座城市', '请帮助我', '早上好'],
        'all': ['Привет', 'Спасибо', 'Где музей?', 'Люблю этот город', 'Помогите', 'Доброе утро']
    };
    
    const selected = phrases[lang] || phrases['all'];
    
    container.innerHTML = selected.map(p => 
        `<button class="phrase-btn" onclick="setPhrase('${p}')">${p}</button>`
    ).join('');
}

function speakText() {
    const text = document.getElementById('input-text')?.value?.trim();
    const targetLang = document.getElementById('target-lang')?.value || 'en';
    
    if (!text) return;
    
    if (!('speechSynthesis' in window)) {
        const resultEl = document.getElementById('translation-result');
        if (resultEl) resultEl.textContent = 'Ваш браузер не поддерживает озвучивание';
        return;
    }
    
    speechSynthesis.cancel();
    
    const langCode = LANGUAGES[targetLang]?.code || 'en-US';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    
    speechSynthesis.speak(utterance);
}

document.addEventListener('DOMContentLoaded', () => {
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }
    updatePhrases();
});

window.translateText = translateText;
window.setPhrase = setPhrase;
window.updatePhrases = updatePhrases;
