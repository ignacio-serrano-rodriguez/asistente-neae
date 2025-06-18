// Debug script for logout button issues
// Add this to browser console to debug

console.log('=== NEAE Assistant Debug Info ===');

// Check if SessionManager exists
console.log('SessionManager available:', typeof SessionManager !== 'undefined');

// Check authentication state
if (typeof SessionManager !== 'undefined') {
    console.log('Is authenticated:', SessionManager.isAuthenticated());
    console.log('Cached user data:', SessionManager.getCachedUserData());
}

// Check DOM elements
const logoutButton = document.getElementById('logoutButton');
const usageInfo = document.getElementById('usageInfo');

console.log('Logout button:', logoutButton);
console.log('Logout button style.display:', logoutButton ? logoutButton.style.display : 'not found');
console.log('Usage info:', usageInfo);
console.log('Usage info style.display:', usageInfo ? usageInfo.style.display : 'not found');

// Check if we're on chat page
console.log('Current hash:', window.location.hash);

// Check if chat class exists
console.log('NEAEChatInterface available:', typeof NEAEChatInterface !== 'undefined');

// Test SessionManager.updateUsageDisplay with mock data
if (typeof SessionManager !== 'undefined') {
    console.log('Testing SessionManager.updateUsageDisplay...');
    SessionManager.updateUsageDisplay({ 
        usage_count: 5, 
        max_uses: 100 
    });
}
