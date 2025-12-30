// Global variables
let currentFileId = null;

// DOM elements
const tableElement = document.getElementById("tableOfContent");
const loadingElement = document.getElementById("loading");
const emptyStateElement = document.getElementById("emptyState");
const refreshButton = document.getElementById("refreshBtn");
const pinModal = document.getElementById("pinModal");
const pinInput = document.getElementById("pinInput");
const closeModalButton = document.getElementById("closeModal");
const cancelPinButton = document.getElementById("cancelPin");
const submitPinButton = document.getElementById("submitPin");

// Initialize the page
function initializePage() {
    initializeTable();
    loadFiles();
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    refreshButton.addEventListener('click', handleRefresh);
    closeModalButton.addEventListener('click', hideModal);
    cancelPinButton.addEventListener('click', hideModal);
    submitPinButton.addEventListener('click', handlePinSubmit);
    
    // Close modal when clicking outside
    pinModal.addEventListener('click', (e) => {
        if (e.target === pinModal) {
            hideModal();
        }
    });
    
    // Handle Enter key in PIN input
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handlePinSubmit();
        }
    });
    
    // Handle Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pinModal.classList.contains('show')) {
            hideModal();
        }
    });
}

// Initialize table structure
function initializeTable() {
    tableElement.innerHTML = "";
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Name', 'Download', 'Size'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    tableElement.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    tableElement.appendChild(tbody);
}

// Load files from server
async function loadFiles() {
    showLoading(true);
    hideEmptyState();
    
    try {
        const response = await fetch("/listOfFiles");
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let items = [];

        if (data) {
            // Handle new Root object structure
            if (data.name === "Root" || data.files || data.folders) {
                const files = data.files || [];
                const folders = data.folders || [];
                
                // Add type marker
                files.forEach(f => f.type = 'file');
                folders.forEach(f => f.type = 'folder');
                
                items = [...folders, ...files];
            } else if (Array.isArray(data)) {
                items = data;
                items.forEach(f => f.type = 'file');
            } else {
                items = Object.values(data);
                items.forEach(f => f.type = 'file');
            }
        }
        
        showLoading(false);
        
        if (items.length === 0) {
            showEmptyState();
        } else {
            updateTable(items);
        }
        
    } catch (error) {
        console.error('Error loading files:', error);
        showLoading(false);
        showError('Failed to load files. Please try again.');
    }
}

// Update table with file data
function updateTable(items) {
    const tbody = tableElement.querySelector('tbody');
    tbody.innerHTML = '';
    
    items.forEach(item => {
        const row = document.createElement('tr');
        
        // Name cell
        const nameCell = document.createElement('td');
        // Add icon based on type
        const icon = item.type === 'folder' ? '📁 ' : '📄 ';
        nameCell.textContent = icon + (item.name || 'Unknown');
        nameCell.title = item.name || 'Unknown'; // Tooltip for long names
        row.appendChild(nameCell);
        
        // Download cell
        const downloadCell = document.createElement('td');
        if (item.type === 'folder') {
            downloadCell.textContent = 'Download Zip';
            downloadCell.className = 'download-cell';
            downloadCell.style.cursor = 'pointer';
            downloadCell.addEventListener('click', () => handleFolderDownload(item.id));
        } else {
            downloadCell.textContent = 'Download';
            downloadCell.className = 'download-cell';
            downloadCell.style.cursor = 'pointer';
            downloadCell.addEventListener('click', () => handleFileDownload(item.id));
        }
        row.appendChild(downloadCell);
        
        // Size cell
        const sizeCell = document.createElement('td');
        const formattedSize = formatFileSize(item.size);
        sizeCell.innerHTML = `<span class="file-size">${formattedSize}</span>`;
        row.appendChild(sizeCell);
        
        tbody.appendChild(row);
    });
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Handle file download
async function handleFileDownload(fileId) {
    if (!fileId) {
        showError('Invalid file ID');
        return;
    }
    
    try {
        // Check if file has a PIN
        const response = await fetch(`/hasPin/${fileId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.hasPIN) {
            // Show PIN modal
            currentFileId = fileId;
            showModal();
        } else {
            // Direct download
            downloadFile(fileId, '');
        }
        
    } catch (error) {
        console.error('Error checking file PIN:', error);
        showError('Failed to process download request');
    }
}

// Download file with optional PIN
function downloadFile(fileId, pin = '') {
    try {
        const url = `/download/${fileId}${pin ? `?pin=${encodeURIComponent(pin)}` : ''}`;
        
        // Create a temporary link element for download
        const link = document.createElement('a');
        link.href = url;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        hideModal();
        
    } catch (error) {
        console.error('Download error:', error);
        showError('Failed to download file');
    }
}

// Handle folder download
function handleFolderDownload(folderId) {
    try {
        const url = `/download-folder/${folderId}`;
        const link = document.createElement('a');
        link.href = url;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Download error:', error);
        showError('Failed to download folder');
    }
}

// Handle PIN submission
function handlePinSubmit() {
    const pin = pinInput.value.trim();
    
    if (!pin) {
        showError('Please enter a PIN');
        pinInput.focus();
        return;
    }
    
    if (currentFileId) {
        downloadFile(currentFileId, pin);
        pinInput.value = ''; // Clear PIN input
        currentFileId = null;
    }
}

// Show PIN modal
function showModal() {
    pinModal.classList.add('show');
    pinInput.focus();
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Hide PIN modal
function hideModal() {
    pinModal.classList.remove('show');
    pinInput.value = '';
    currentFileId = null;
    document.body.style.overflow = ''; // Restore scrolling
}

// Handle refresh button
async function handleRefresh() {
    refreshButton.disabled = true;
    const refreshIcon = refreshButton.querySelector('.refresh-icon');
    refreshIcon.style.animation = 'spin 1s linear infinite';
    
    await loadFiles();
    
    setTimeout(() => {
        refreshButton.disabled = false;
        refreshIcon.style.animation = '';
    }, 500); // Small delay to show the animation
}

// Show/hide loading state
function showLoading(show) {
    if (show) {
        loadingElement.style.display = 'flex';
        tableElement.style.display = 'none';
        emptyStateElement.style.display = 'none';
    } else {
        loadingElement.style.display = 'none';
        tableElement.style.display = 'table';
    }
}

// Show empty state
function showEmptyState() {
    emptyStateElement.style.display = 'block';
    tableElement.style.display = 'none';
}

// Hide empty state
function hideEmptyState() {
    emptyStateElement.style.display = 'none';
}

// Show error message (you can customize this further)
function showError(message) {
    // For now, using alert. You could implement a toast notification system
    alert(message);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializePage);

// Fallback for older browsers
window.addEventListener('load', () => {
    if (!document.readyState || document.readyState === 'loading') {
        initializePage();
    }
});