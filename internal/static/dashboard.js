// Global variables
let currentFileId = null;
let currentFileName = null;
let isUploading = false;

// DOM elements
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileEl');
const fileNameInput = document.getElementById('fileName');
const pinInput = document.getElementById('pinCode');
const submitButton = document.getElementById('submitButton');
const tableElement = document.getElementById('tableOfContent');
const loadingElement = document.getElementById('loading');
const emptyStateElement = document.getElementById('emptyState');
const refreshButton = document.getElementById('refreshBtn');
const logoutButton = document.getElementById('logoutBtn');
const deleteModal = document.getElementById('deleteModal');
const fileNameToDelete = document.getElementById('fileNameToDelete');
const toast = document.getElementById('toast');

// Initialize the dashboard
function initializeDashboard() {
    initializeTable();
    loadFiles();
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Upload form
    uploadForm.addEventListener('submit', handleUpload);
    fileInput.addEventListener('change', handleFileSelection);
    
    // Buttons
    refreshButton.addEventListener('click', handleRefresh);
    logoutButton.addEventListener('click', handleLogout);
    
    // Delete modal
    document.getElementById('closeDeleteModal').addEventListener('click', hideDeleteModal);
    document.getElementById('cancelDelete').addEventListener('click', hideDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', handleConfirmDelete);
    
    // Close modal when clicking outside
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            hideDeleteModal();
        }
    });
    
    // Auto-generate filename from selected file
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && !fileNameInput.value.trim()) {
            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            fileNameInput.value = nameWithoutExt;
        }
    });
    
    // Handle Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && deleteModal.classList.contains('show')) {
            hideDeleteModal();
        }
    });
}

// Handle file selection display
function handleFileSelection() {
    const fileInputWrapper = document.querySelector('.file-input-wrapper');
    const fileText = document.querySelector('.file-text');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileInputWrapper.classList.add('has-file');
        fileText.textContent = file.name;
        
        // Auto-fill filename if empty
        if (!fileNameInput.value.trim()) {
            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            fileNameInput.value = nameWithoutExt;
        }
    } else {
        fileInputWrapper.classList.remove('has-file');
        fileText.textContent = 'Choose a file...';
    }
}

// Handle file upload
async function handleUpload(e) {
    e.preventDefault();
    
    if (isUploading) return;
    
    const file = fileInput.files[0];
    const fileName = fileNameInput.value.trim();
    const pinCode = pinInput.value.trim();
    
    // Validation
    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }
    
    if (!fileName) {
        showToast('Please enter a file name', 'error');
        return;
    }
    
    // Set loading state
    setUploadingState(true);
    
    try {
        // Get file extension and create full name
        const fileExtension = file.name.split('.').pop();
        const fullFileName = `${fileName}.${fileExtension}`;
        
        // Check for duplicate names
        const isDuplicate = await checkForDuplicate(fullFileName);
        if (isDuplicate) {
            showToast(`A file named "${fullFileName}" already exists`, 'error');
            setUploadingState(false);
            return;
        }
        
        // Prepare form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', fileName);
        if (pinCode) {
            formData.append('pinCode', pinCode);
        }
        
        // Upload file
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.text();
            showToast('File uploaded successfully!', 'success');
            
            // Reset form
            resetForm();
            
            // Refresh file list
            await loadFiles();
        } else {
            const errorText = await response.text();
            showToast(errorText || 'Upload failed', 'error');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed due to network error', 'error');
    } finally {
        setUploadingState(false);
    }
}

// Check for duplicate filenames
async function checkForDuplicate(fullFileName) {
    try {
        const response = await fetch('/listOfFiles');
        if (!response.ok) return false;
        
        const data = await response.json();
        const files = Array.isArray(data) ? data : Object.values(data);
        
        return files.some(file => file.name === fullFileName);
    } catch (error) {
        console.error('Error checking duplicates:', error);
        return false;
    }
}

// Set uploading state
function setUploadingState(uploading) {
    isUploading = uploading;
    submitButton.disabled = uploading;
    
    const btnText = document.querySelector('.btn-text');
    const btnSpinner = document.querySelector('.btn-spinner');
    
    if (uploading) {
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline-block';
    } else {
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
}

// Reset form
function resetForm() {
    uploadForm.reset();
    fileNameInput.value = '';
    pinInput.value = '';
    
    // Reset file input display
    const fileInputWrapper = document.querySelector('.file-input-wrapper');
    const fileText = document.querySelector('.file-text');
    fileInputWrapper.classList.remove('has-file');
    fileText.textContent = 'Choose a file...';
}

// Initialize table structure
function initializeTable() {
    tableElement.innerHTML = '';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Name', 'Delete', 'ID'];
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
        const response = await fetch('/listOfFiles');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const files = Array.isArray(data) ? data : Object.values(data);
        
        showLoading(false);
        
        if (files.length === 0) {
            showEmptyState();
        } else {
            updateTable(files);
        }
        
    } catch (error) {
        console.error('Error loading files:', error);
        showLoading(false);
        showToast('Failed to load files', 'error');
    }
}

// Update table with file data
function updateTable(files) {
    const tbody = tableElement.querySelector('tbody');
    tbody.innerHTML = '';
    
    files.forEach(file => {
        const row = document.createElement('tr');
        
        // Name cell
        const nameCell = document.createElement('td');
        nameCell.textContent = file.name || 'Unknown';
        nameCell.title = file.name || 'Unknown'; // Tooltip for long names
        row.appendChild(nameCell);
        
        // Delete cell
        const deleteCell = document.createElement('td');
        deleteCell.textContent = 'Delete';
        deleteCell.className = 'delete-cell';
        deleteCell.style.cursor = 'pointer';
        deleteCell.addEventListener('click', () => handleDeleteClick(file.id, file.name));
        row.appendChild(deleteCell);
        
        // ID cell
        const idCell = document.createElement('td');
        idCell.innerHTML = `<span class="file-id">${file.id}</span>`;
        row.appendChild(idCell);
        
        tbody.appendChild(row);
    });
}

// Handle delete button click
function handleDeleteClick(fileId, fileName) {
    currentFileId = fileId;
    currentFileName = fileName;
    fileNameToDelete.textContent = fileName;
    showDeleteModal();
}

// Show delete confirmation modal
function showDeleteModal() {
    deleteModal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Hide delete confirmation modal
function hideDeleteModal() {
    deleteModal.classList.remove('show');
    currentFileId = null;
    currentFileName = null;
    document.body.style.overflow = ''; // Restore scrolling
}

// Handle confirm delete
async function handleConfirmDelete() {
    if (!currentFileId) return;
    
    try {
        const response = await fetch(`/delete/${currentFileId}`);
        const result = await response.text();
        
        if (response.ok) {
            showToast('File deleted successfully', 'success');
            hideDeleteModal();
            await loadFiles(); // Refresh the file list
        } else {
            showToast(result || 'Delete failed', 'error');
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Delete failed due to network error', 'error');
    }
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

// Handle logout
async function handleLogout() {
    try {
        const response = await fetch('/logout', { method: 'POST' });
        
        if (response.ok) {
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Logout failed' }));
            showToast(errorData.error || 'Logout failed', 'error');
        }
    } catch (error) {
        console.error('Error logging out:', error);
        showToast('Logout failed due to network error', 'error');
    }
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

// Show toast notification
function showToast(message, type = 'success') {
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set message and icon
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toastIcon.textContent = '✅';
        toast.className = 'toast success';
    } else if (type === 'error') {
        toastIcon.textContent = '❌';
        toast.className = 'toast error';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Fallback for older browsers
window.addEventListener('load', () => {
    if (!document.readyState || document.readyState === 'loading') {
        initializeDashboard();
    }
});