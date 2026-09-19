// LearnLens AI - Autonomous Tab Companion Content Script
// Handles hands-free auto-next progression, speed acceleration, and pause bypass

(function() {
  console.log('[LearnLens AI Auto-Pilot] Content script activated on tab.');

  // 1. Auto-Advance Next Video on Completion
  setInterval(() => {
    const video = document.querySelector('video');
    if (!video) return;

    // Check if video is finished or at the very end (>99%)
    const isFinished = video.ended || (video.duration > 0 && video.currentTime / video.duration > 0.995);

    if (isFinished) {
      // Platform-specific Next buttons
      const ytNext = document.querySelector('.ytp-next-button');
      const courseraNext = document.querySelector('button[data-e2e="next-item"]') || 
                           document.querySelector('.next-item-btn') || 
                           document.querySelector('button[aria-label="Next Item"]');
      const udemyNext = document.querySelector('button[data-purpose="go-to-next-item"]') ||
                        document.querySelector('button[data-purpose="next-button"]');
      const genericNext = document.querySelector('button.next-lecture, a.next-lecture, .btn-next');

      const nextBtn = ytNext || courseraNext || udemyNext || genericNext;
      if (nextBtn && nextBtn instanceof HTMLElement) {
        console.log('[LearnLens AI Auto-Pilot] Advancing to next video lecture...');
        nextBtn.click();
      }
    }

    // 2. Bypass "Are you still watching?" / Inactivity prompts
    const ytConfirm = document.querySelector('yt-confirm-dialog-renderer #confirm-button button');
    if (ytConfirm && ytConfirm instanceof HTMLElement) {
      console.log('[LearnLens AI Auto-Pilot] Dismissing YouTube idle prompt...');
      ytConfirm.click();
    }
  }, 2000);

  // 3. Listen for commands from LearnLens Studio or Extension Popup
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'LEARNLENS_SET_SPEED') {
      const video = document.querySelector('video');
      if (video) {
        video.playbackRate = parseFloat(event.data.speed || 1.0);
        console.log(`[LearnLens AI Auto-Pilot] Set video playbackRate to ${video.playbackRate}x`);
      }
    }
  });

  chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
    if (request.action === 'set_speed') {
      const video = document.querySelector('video');
      if (video) {
        video.playbackRate = parseFloat(request.speed || 1.0);
        sendResponse({ success: true, speed: video.playbackRate });
      }
    } else if (request.action === 'trigger_next') {
      const ytNext = document.querySelector('.ytp-next-button');
      const courseraNext = document.querySelector('button[data-e2e="next-item"]');
      const udemyNext = document.querySelector('button[data-purpose="go-to-next-item"]');
      const btn = ytNext || courseraNext || udemyNext;
      if (btn && btn instanceof HTMLElement) {
        btn.click();
        sendResponse({ success: true });
      }
    }
  });
})();
