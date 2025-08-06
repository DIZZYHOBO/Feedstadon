export function showLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.classList.add('loading');
        // Reset animation
        loadingBar.style.transform = 'scaleX(0)';
        setTimeout(() => {
            loadingBar.style.transform = 'scaleX(0.7)';
        }, 10);
    }
}

export function hideLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.style.transform = 'scaleX(1)';
        setTimeout(() => {
            loadingBar.classList.remove('loading');
            loadingBar.style.transform = 'scaleX(0)';
        }, 300);
    }
}
