// app.js - Simplified main entry point for Alpine.js version

// Import legacy components that might still be needed
import { initImageModal } from './components/ui.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('App loading...');
    
    // Initialize image modal for legacy compatibility
    initImageModal();
    
    // Setup any remaining legacy event listeners
    setupLegacyEventListeners();
    
    console.log('App initialization complete');
});

function setupLegacyEventListeners() {
    // Keep some essential legacy functionality that isn't converted yet
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('visible');
        }
    });
    
    // Handle escape key for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.visible').forEach(modal => {
                modal.classList.remove('visible');
            });
        }
    });
}

// Export for legacy compatibility
export default {};
