// Slower, more continuous viewer count fluctuation using time-based function
function getContinuousViewers() {
  const now = Date.now();
  const cycleDuration = 600 * 1000;
  const phase = (now % cycleDuration) / cycleDuration * Math.PI * 2;
  const baseViewers = 10;
  const fluctuation = Math.sin(phase) * 5;
  const viewers = Math.round(baseViewers + fluctuation);
  
  return viewers;
}

function updateViewerCount() {
  const viewerElement = document.getElementById('viewer-count');
  if (viewerElement) {
    const viewers = getContinuousViewers();
    viewerElement.textContent = viewers;
  }
}

// Update viewer count every 5 seconds for slower fluctuation
function scheduleNextUpdate() {
  setTimeout(() => {
    updateViewerCount();
    scheduleNextUpdate();
  }, 5000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  updateViewerCount();
  scheduleNextUpdate();
});
