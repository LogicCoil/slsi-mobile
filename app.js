let isVoiceActive = false;
let recognition = null;

// Check for stored API key on startup
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('slsi_api_key');
    if (!savedKey) {
        document.getElementById('apiKeyModal').style.display = 'flex';
    }
});

function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (!key) {
        alert('Please enter a valid API key.');
        return;
    }
    localStorage.setItem('slsi_api_key', key);
    document.getElementById('apiKeyModal').style.display = 'none';
}

// Initialize Speech Recognition for Mobile Browsers & WebViews
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('userInput').value = transcript;
        sendMessage();
    };

    recognition.onerror = (err) => {
        console.error("Speech Error:", err);
        if (isVoiceActive) recognition.start();
    };

    recognition.onend = () => {
        if (isVoiceActive) recognition.start();
    };
}

function toggleVoiceMode() {
    if (!recognition) {
        alert("Microphone input is not supported on this device/browser.");
        return;
    }

    const micBtn = document.getElementById('micBtn');
    const voiceStatus = document.getElementById('voiceStatus');
    isVoiceActive = !isVoiceActive;

    if (isVoiceActive) {
        micBtn.classList.add('active');
        voiceStatus.textContent = "VOICE: LISTENING";
        voiceStatus.style.color = "#FF3366";
        speakText("S.L.S.I. listening.");
        recognition.start();
    } else {
        micBtn.classList.remove('active');
        voiceStatus.textContent = "VOICE: OFF";
        voiceStatus.style.color = "#8A99AD";
        recognition.stop();
        window.speechSynthesis.cancel();
        speakText("Voice mode off.");
    }
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanSpeech = text.replace(/```[\s\S]*?```/g, 'Code block generated.').replace(/[^a-zA-Z0-9.,?! ]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanSpeech);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

async function sendMessage() {
    const apiKey = localStorage.getItem('slsi_api_key');
    if (!apiKey) {
        document.getElementById('apiKeyModal').style.display = 'flex';
        return;
    }

    const input = document.getElementById('userInput');
    const chatBox = document.getElementById('chatBox');
    const text = input.value.trim();
    if (!text) return;

    // User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.textContent = text;
    chatBox.appendChild(userMsg);
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // AI Placeholder
    const aiMsg = document.createElement('div');
    aiMsg.className = 'message ai';
    aiMsg.textContent = 'Thinking...';
    chatBox.appendChild(aiMsg);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const aiResponse = await callGeminiAPI(text, apiKey);
        aiMsg.textContent = aiResponse;

        if (isVoiceActive) speakText(aiResponse);
    } catch (err) {
        aiMsg.textContent = `Error: ${err.message}`;
        if (isVoiceActive) speakText("Connection error.");
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}

// Gemini API Call using dynamic user key
async function callGeminiAPI(promptText, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else if (data.error) {
            return `API Error: ${data.error.message}`;
        } else {
            return "Unable to process request.";
        }
    } catch (error) {
        clearTimeout(timeoutId);
        return `Fetch Error: ${error.message}`;
    }
}

document.getElementById('userInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});