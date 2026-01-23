// Global variables
const folderNav = window.FolderNav;
let pendingPinAction = null;

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
}

// Load files from server
async function loadFiles(folderId = null, pin = '') {
    showLoading(true);
    hideEmptyState();

    const targetId = folderId || folderNav.ROOT_ID;
    folderNav.setCurrentFolderID(targetId);

    if (!pin && targetId) {
        const cached = folderNav.getCachedPin(targetId);
        if (cached) pin = cached;
    }

    try {
        const data = await folderNav.fetchFolderContents(targetId, pin);
        if (pin) {
            folderNav.cacheFolderPin(targetId, pin);
        }

        showLoading(false);

        const allItems = [...(data.folders || []), ...(data.files || [])];
        const isRoot = targetId === folderNav.ROOT_ID;
        if (allItems.length === 0) {
            if (!isRoot) {
                updateTable(data, isRoot);
            } else {
                showEmptyState();
            }
        } else {
            updateTable(data, isRoot);
        }
    } catch (error) {
        console.error('Error loading files:', error);
        showLoading(false);
        showError('Failed to load files. Please try again.');
    }
}

// Update table with file data
function updateTable(data, isRoot) {
    tableElement.innerHTML = '';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Name</th>
            <th>Size</th>
            <th>Type</th>
            <th>Actions</th>
        </tr>
    `;
    tableElement.appendChild(thead);

    const tbody = document.createElement('tbody');

    if (!isRoot && folderNav.getFolderHistory().length > 0) {
        const backRow = document.createElement('tr');
        backRow.className = 'folder-row back-row';
        backRow.innerHTML = `
            <td colspan="4" style="cursor: pointer; font-weight: bold;">
                <i class="fa-solid fa-arrow-left" aria-hidden="true" style="margin-right: 0.5rem;"></i>Back to parent folder
            </td>
        `;
        backRow.onclick = () => navigateBack();
        tbody.appendChild(backRow);
    }

    (data.folders || []).forEach(folder => {
        const row = document.createElement('tr');
        row.className = 'folder-row';
        row.style.cursor = 'pointer';

        row.innerHTML = `
            <td class="name-cell">
                <div class="name-stack">
                    <i class="fa-solid fa-folder" aria-hidden="true"></i>
                    <span class="name-text" title="${folder.name || ''}">${folder.name || 'Folder'}</span>
                </div>
            </td>
            <td><span class="file-size">${formatFileSize(folder.size)}</span></td>
            <td>Folder</td>
            <td>
                <button class="download-cell" type="button">Download</button>
            </td>
        `;

        row.querySelector('.download-cell')?.addEventListener('click', (e) => {
            e.stopPropagation();
            handleFolderDownload(folder.id);
        });

        row.onclick = (e) => {
            if (!e.target.closest('.download-cell')) {
                handleFolderNavigation(folder.id, folder.name || '');
            }
        };
        tbody.appendChild(row);
    });

    (data.files || []).forEach(file => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="name-cell">
                <div class="name-stack">
                    <i class="fa-regular fa-file" aria-hidden="true"></i>
                    <span class="name-text" title="${file.name || ''}">${file.name || 'File'}</span>
                </div>
            </td>
            <td><span class="file-size">${formatFileSize(file.size)}</span></td>
            <td>${file.extension || 'file'}</td>
            <td>
                <button class="download-cell" type="button">Download</button>
            </td>
        `;
        row.querySelector('.download-cell')?.addEventListener('click', () => handleFileDownload(file.id));
        tbody.appendChild(row);
    });

    tableElement.appendChild(tbody);
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
            pendingPinAction = { type: 'file', id: fileId };
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

async function handleFolderNavigation(folderId, folderName) {
    try {
        await folderNav.handleFolderNavigation(folderId, folderName, {
            checkPin: async (id) => {
                const response = await fetch(`/hasFolderPin/${id}`);
                if (!response.ok) {
                    throw new Error('Failed to check folder PIN');
                }
                const data = await response.json();
                return !!data.hasPIN;
            },
            onPinRequired: (payload) => {
                pendingPinAction = payload;
                showModal();
            },
            loadFn: loadFiles
        });
    } catch (error) {
        showError('Failed to open folder');
    }
}

function navigateBack() {
    folderNav.navigateBack(loadFiles);
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

    if (pendingPinAction?.type === 'file') {
        downloadFile(pendingPinAction.id, pin);
    } else if (pendingPinAction?.type === 'folder') {
        folderNav.cacheFolderPin(pendingPinAction.id, pin);
        folderNav.navigateToFolder(pendingPinAction.id, pendingPinAction.name || '', pin, loadFiles);
        hideModal();
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
    pendingPinAction = null;
    document.body.style.overflow = ''; // Restore scrolling
}

// Handle refresh button
async function handleRefresh() {
    refreshButton.disabled = true;
    const refreshIcon = refreshButton.querySelector('.refresh-icon');
    refreshIcon.style.animation = 'spin 1s linear infinite';

    await loadFiles(folderNav.getCurrentFolderID());
    
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