const folderNav = window.FolderNav;
let currentUploadDescriptor = null;
let fileInput = null;
let folderInput = null;
let fileNameInput = null;
let dropzone = null;
let dropText = null;
let pinModal = null;
let pinInput = null;
let closePinModalButton = null;
let cancelPinButton = null;
let submitPinButton = null;
let pinModalTitle = null;
let pinModalDescription = null;
let pendingPinAction = null;

document.addEventListener('DOMContentLoaded', () => {
    loadFiles();

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => loadFiles(folderNav.getCurrentFolderID()));

    // File Input Listeners
    fileInput = document.getElementById('fileEl');
    folderInput = document.getElementById('folderEl');
    fileNameInput = document.getElementById('fileName');
    dropzone = document.getElementById('fileDropzone');
    dropText = document.getElementById('fileDropText');
    const pickFilesBtn = document.getElementById('pickFilesBtn');
    const pickFolderBtn = document.getElementById('pickFolderBtn');

    pinModal = document.getElementById('pinModal');
    pinInput = document.getElementById('pinInput');
    closePinModalButton = document.getElementById('closePinModal');
    cancelPinButton = document.getElementById('cancelPin');
    submitPinButton = document.getElementById('submitPin');
    pinModalTitle = document.getElementById('pinModalTitle');
    pinModalDescription = document.getElementById('pinModalDescription');

    pickFilesBtn?.addEventListener('click', () => fileInput?.click());
    pickFolderBtn?.addEventListener('click', () => folderInput?.click());

    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');

            const entries = await extractDropEntries(e.dataTransfer);
            if (!entries.length) {
                showToast('No files detected in drop', 'error');
                return;
            }

            currentUploadDescriptor = buildDescriptorFromEntries(entries);
            setDropzoneStatus(dropText, dropzone, currentUploadDescriptor);

            if (fileInput) fileInput.value = '';
            if (folderInput) folderInput.value = '';
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            updateFileInputDisplay(e.target, 'file');
            // Auto-fill name if single file
            if (e.target.files.length === 1 && fileNameInput) {
                fileNameInput.value = e.target.files[0].name;
            }
            if (folderInput) folderInput.value = '';

            currentUploadDescriptor = analyzeFileInput(e.target.files);
            setDropzoneStatus(dropText, dropzone, currentUploadDescriptor);
        });
    }

    if (folderInput) {
        folderInput.addEventListener('change', (e) => {
            updateFileInputDisplay(e.target, 'folder');
            // Auto-fill name if single folder (though webkitdirectory usually selects contents)
            if (e.target.files.length > 0 && fileNameInput) {
                // Try to get the folder name from the first file's path
                const path = e.target.files[0].webkitRelativePath;
                const folderName = path.split('/')[0];
                if (folderName) {
                    fileNameInput.value = folderName;
                }
            }
            if (fileInput) fileInput.value = '';

            currentUploadDescriptor = analyzeFileInput(e.target.files);
            setDropzoneStatus(dropText, dropzone, currentUploadDescriptor);
        });
    }

    if (closePinModalButton) {
        closePinModalButton.addEventListener('click', hidePinModal);
    }
    if (cancelPinButton) {
        cancelPinButton.addEventListener('click', hidePinModal);
    }
    if (submitPinButton) {
        submitPinButton.addEventListener('click', handlePinSubmit);
    }
    if (pinModal) {
        pinModal.addEventListener('click', (e) => {
            if (e.target === pinModal) {
                hidePinModal();
            }
        });
    }
    if (pinInput) {
        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handlePinSubmit();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pinModal?.classList.contains('show')) {
            hidePinModal();
        }
    });
});

function updateFileInputDisplay(input, type) {
    if (!input?.files) return;
}

function setDropzoneStatus(dropText, dropzone, descriptor) {
    if (!dropText || !dropzone) return;
    if (!descriptor || !descriptor.entries?.length) {
        dropText.textContent = 'Drop files or folders here';
        dropzone.classList.remove('has-file');
        return;
    }
    dropzone.classList.add('has-file');
    if (descriptor.type === 'folder') {
        dropText.textContent = `${descriptor.totalFiles} items from folder`; 
    } else if (descriptor.totalFiles === 1) {
        dropText.textContent = descriptor.entries[0].file.name;
    } else {
        dropText.textContent = `${descriptor.totalFiles} files selected`;
    }
}

function buildDescriptorFromEntries(entries) {
    const totalSize = entries.reduce((size, entry) => size + entry.size, 0);
    const hasRelativePath = entries.some((entry) => entry.relativePath && entry.relativePath.includes('/'));
    let type = 'files';
    if (entries.length === 1 && !hasRelativePath) {
        type = 'file';
    } else if (hasRelativePath) {
        type = 'folder';
    }

    return {
        type,
        totalFiles: entries.length,
        totalSize,
        entries
    };
}

async function extractDropEntries(dataTransfer) {
    if (!dataTransfer) return [];
    const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
    if (!items.length) {
        return Array.from(dataTransfer.files || []).map((file) => ({
            file,
            size: file.size,
            relativePath: file.webkitRelativePath || null
        }));
    }

    const entryPromises = items
        .filter((item) => item.kind === 'file')
        .map((item) => item.webkitGetAsEntry ? item.webkitGetAsEntry() : null)
        .filter(Boolean)
        .map((entry) => traverseEntry(entry, ''));

    const nested = await Promise.all(entryPromises);
    return nested.flat();
}

function readEntries(reader) {
    return new Promise((resolve) => reader.readEntries(resolve));
}

async function readAllEntries(reader) {
    let entries = [];
    while (true) {
        const batch = await readEntries(reader);
        if (!batch.length) break;
        entries = entries.concat(batch);
    }
    return entries;
}

async function traverseEntry(entry, prefix) {
    if (entry.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        return [{
            file,
            size: file.size,
            relativePath: prefix + file.name
        }];
    }
    if (entry.isDirectory) {
        const reader = entry.createReader();
        const children = await readAllEntries(reader);
        const allFiles = [];
        for (const child of children) {
            const childFiles = await traverseEntry(child, `${prefix}${entry.name}/`);
            allFiles.push(...childFiles);
        }
        return allFiles;
    }
    return [];
}

async function loadFiles(folderId = null, pin = '') {
    const table = document.getElementById('tableOfContent');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');

    // If no folderId provided, use root
    if (!folderId) {
        folderId = folderNav.ROOT_ID;
    }

    // Update current folder ID
    folderNav.setCurrentFolderID(folderId);

    if (loading) loading.style.display = 'block';
    if (table) table.innerHTML = '';
    if (emptyState) emptyState.style.display = 'none';

    if (!pin && folderId) {
        const cached = folderNav.getCachedPin(folderId);
        if (cached) pin = cached;
    }

    try {
        const isRoot = folderId === folderNav.ROOT_ID;
        const data = await folderNav.fetchFolderContents(folderId, pin);
        if (pin) {
            folderNav.cacheFolderPin(folderId, pin);
        }

        if (loading) loading.style.display = 'none';

        const allItems = [...(data.folders || []), ...(data.files || [])];

        if (allItems.length === 0) {
            // Show back button even if folder is empty (unless we're at root)
            if (!isRoot) {
                renderBackButton(table);
            }
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        // Create Table Header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Type</th>
                <th>Date</th>
                <th>Actions</th>
            </tr>
        `;
        table.appendChild(thead);

        // Create Table Body
        const tbody = document.createElement('tbody');
        
        // Add back button if not at root
        if (!isRoot && folderNav.getFolderHistory().length > 0) {
            const backRow = document.createElement('tr');
            backRow.className = 'folder-row back-row';
            backRow.innerHTML = `
                <td colspan="5" style="cursor: pointer; font-weight: bold;">
                    <i class="fa-solid fa-arrow-left" aria-hidden="true" style="margin-right: 0.5rem;"></i>Back to parent folder
                </td>
            `;
            backRow.onclick = () => navigateBack();
            tbody.appendChild(backRow);
        }
        
        // Render Folders (make them clickable)
        if (data.folders) {
            data.folders.forEach(folder => {
                const row = document.createElement('tr');
                row.className = 'folder-row';
                row.style.cursor = 'pointer';
                const rawName = folder.name || '';
                const displayName = escapeHtml(truncateName(rawName));
                const fullName = escapeHtml(rawName);
                const safeNameForJs = rawName.replace(/'/g, "\\'");
                const folderLink = `${window.location.origin}/download-folder/${folder.id}`;
                row.innerHTML = `
                    <td class="name-cell">
                        <div class="name-stack">
                            <i class="fa-solid fa-folder" aria-hidden="true"></i>
                            <span class="name-text" title="${fullName}">${displayName}</span>
                        </div>
                    </td>
                        <td>${formatBytes(folder.size)}</td>
                    <td>Folder</td>
                    <td>${new Date(folder.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-link share-btn" data-url="${folderLink}" onclick="event.stopPropagation()">Share</button>
                        <button class="btn-link primary folder-download-btn" data-folder-id="${folder.id}" onclick="event.stopPropagation()">Download</button>
                        <button onclick="event.stopPropagation(); deleteFolder('${folder.id}', '${safeNameForJs}')" class="btn-link delete">Delete</button>
                    </td>
                `;
                // Make the entire row clickable to open the folder
                row.onclick = (e) => {
                    // Only navigate if not clicking on action buttons
                    if (!e.target.closest('.btn-link') && !e.target.closest('button')) {
                            handleFolderNavigation(folder.id, folder.name);
                    }
                };
                tbody.appendChild(row);
            });
        }

        // Render Files
        if (data.files) {
            data.files.forEach(file => {
                const row = document.createElement('tr');
                const rawName = file.name || '';
                const displayName = escapeHtml(truncateName(rawName));
                const fullName = escapeHtml(rawName);
                const safeNameForJs = rawName.replace(/'/g, "\\'");
                const downloadLink = buildDownloadLink(file.id);
                row.innerHTML = `
                    <td class="name-cell">
                        <div class="name-stack">
                            <i class="fa-regular fa-file" aria-hidden="true"></i>
                            <span class="name-text" title="${fullName}">${displayName}</span>
                            <button class="copy-btn" title="Copy download link" data-copy="${downloadLink}">
                                <i class="fa-regular fa-copy" aria-hidden="true"></i>
                            </button>
                        </div>
                    </td>
                    <td>${formatBytes(file.size)}</td>
                    <td>${file.extension || 'file'}</td>
                    <td>${new Date(file.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-link share-btn" data-url="${downloadLink}">Share</button>
                        <button class="btn-link primary download-btn" data-file-id="${file.id}">Download</button>
                        <button onclick="deleteFile('${file.id}', '${safeNameForJs}')" class="btn-link delete">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
        table.appendChild(tbody);

        table.querySelectorAll('.copy-btn').forEach((btn) => {
            btn.addEventListener('click', async (event) => {
                event.stopPropagation();
                const link = btn.getAttribute('data-copy');
                if (!link) return;
                try {
                    await navigator.clipboard.writeText(link);
                    showToast('Link copied to clipboard', 'success');
                } catch (error) {
                    showToast('Failed to copy link', 'error');
                }
            });
        });

        table.querySelectorAll('.share-btn').forEach((btn) => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                const url = btn.getAttribute('data-url');
                if (!url || !window.Share) return;
                window.Share.show(url, document.title);
            });
        });

        table.querySelectorAll('.download-btn').forEach((btn) => {
            btn.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const fileId = btn.getAttribute('data-file-id');
                if (fileId) {
                    await handleFileDownload(fileId);
                }
            });
        });

        table.querySelectorAll('.folder-download-btn').forEach((btn) => {
            btn.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const folderId = btn.getAttribute('data-folder-id');
                if (folderId) {
                    await handleFolderDownload(folderId);
                }
            });
        });

    } catch (error) {
        console.error('Error loading files:', error);
        if (loading) loading.style.display = 'none';
        showToast('Failed to load files. Please try again.', 'error');
    }
}

function renderBackButton(table) {
    const tbody = document.createElement('tbody');
    const backRow = document.createElement('tr');
    backRow.className = 'folder-row back-row';
    backRow.style.cursor = 'pointer';
    backRow.innerHTML = `
        <td colspan="5" style="font-weight: bold;">
            <i class="fa-solid fa-arrow-left" aria-hidden="true" style="margin-right: 0.5rem;"></i>Back to parent folder
        </td>
    `;
    backRow.onclick = () => navigateBack();
    tbody.appendChild(backRow);
    table.appendChild(tbody);
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
                pendingPinAction = { ...payload, type: 'folder-open' };
                showPinModal('folder-open');
            },
            loadFn: loadFiles
        });
    } catch (error) {
        showToast('Failed to open folder', 'error');
    }
}

function navigateBack() {
    folderNav.navigateBack(loadFiles);
}


function analyzeFileInput(fileList){
    const files = Array.from(fileList);

    let hasRelativePath = files.some(file=> file.webkitRelativePath && file.webkitRelativePath.includes("/"));
    let type;
    if(files.length === 1 && !hasRelativePath ){
        type ="file";
    }else if(hasRelativePath){
        type = "folder";
    }else{
        type = "files";
    }

    const entries = files.map(file=>({
        file,
        size:file.size,
        relativePath: file.webkitRelativePath || null
    }));

    const totalSize = entries.reduce((size, entry)=> size + entry.size, 0);

    return{
        type,
        totalFiles : entries.length,
        totalSize,
        entries,
    };
}

async function handleUpload(e) {
    e.preventDefault();
    
    const pinInput = document.getElementById('pinCode');
    const submitBtn = document.getElementById('submitButton');

    // Determine which input has files
    let descriptor = currentUploadDescriptor;
    if (!descriptor) {
        if (fileInput.files && fileInput.files.length > 0) {
            descriptor = analyzeFileInput(fileInput.files);
        } else if (folderInput.files && folderInput.files.length > 0) {
            descriptor = analyzeFileInput(folderInput.files);
        }
    }

    if (!descriptor || !descriptor.entries?.length) {
        showToast('Please select files or a folder to upload', 'error');
        return;
    }

    const formData = new FormData();
    const currentId = folderNav.getCurrentFolderID();
    if (currentId && currentId !== folderNav.ROOT_ID) {
        formData.append('parent_id', currentId);
    }
    formData.append('pin_code', pinInput.value || '');
    formData.append('contentType', descriptor.type);
    if ((descriptor.type === 'file' || descriptor.type === 'folder') && fileNameInput?.value) {
        formData.append('display_name', fileNameInput.value.trim());
    }

    for (const entry of descriptor.entries) {
        formData.append('files', entry.file);
        if (entry.relativePath) {
            formData.append('paths', entry.relativePath);
        }
    }

    // UI Loading State
    submitBtn.disabled = true;
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    if (btnText) btnText.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';

    try {
        // Log FormData contents for debugging
        console.log('=== FormData Contents ===');
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`${key}:`, {
                    name: value.name,
                    size: value.size,
                    type: value.type
                });
            } else {
                console.log(`${key}:`, value);
            }
        }
        console.log('========================');
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showToast('Upload successful!', 'success');
            
            // Clear inputs and re-enable both
            fileInput.value = '';
            folderInput.value = '';
            pinInput.value = '';
            if (fileNameInput) fileNameInput.value = '';
            currentUploadDescriptor = null;
            setDropzoneStatus(dropText, dropzone, null);
            
            // Re-enable both inputs
            fileInput.disabled = false;
            folderInput.disabled = false;
            
            loadFiles(folderNav.getCurrentFolderID()); // Refresh current folder
        } else {
            const msg = await response.text();
            throw new Error(msg);
        }
    } catch (error) {
        showToast('Upload failed: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
    }
}

async function deleteFile(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
        const response = await fetch(`/delete/file/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('File deleted', 'success');
            loadFiles(folderNav.getCurrentFolderID()); // Reload current folder
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteFolder(id, name) {
    if (!confirm(`Are you sure you want to delete folder "${name}" and all its contents?`)) return;
    
    try{
        const response = await fetch(`/delete/folder/${id}`, {method:'DELETE'});
        if (response.ok) {
            showToast('Folder deleted', 'success');
            loadFiles(folderNav.getCurrentFolderID()); // Reload current folder
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const content = toast.querySelector('.toast-content');
    if (content) {
        content.textContent = message;
    } else {
        toast.textContent = message;
    }
    
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}

function truncateName(name, head = 6, tail = 4) {
    if (!name) return '';
    if (name.length <= head + tail + 3) return name;
    return `${name.slice(0, head)}...${name.slice(-tail)}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildDownloadLink(id) {
    return `${window.location.origin}/download/${id}`;
}

async function handleFileDownload(fileId) {
    try {
        const response = await fetch(`/hasPin/${fileId}`);
        if (!response.ok) {
            throw new Error('Failed to check PIN');
        }
        const data = await response.json();
        if (data.hasPIN) {
            pendingPinAction = { type: 'file', id: fileId };
            showPinModal('file');
        } else {
            downloadFile(fileId, '');
        }
    } catch (error) {
        showToast('Failed to start download', 'error');
    }
}

async function handleFolderDownload(folderId) {
    try {
        const response = await fetch(`/hasFolderPin/${folderId}`);
        if (!response.ok) {
            throw new Error('Failed to check folder PIN');
        }
        const data = await response.json();
        if (data.hasPIN) {
            pendingPinAction = { type: 'folder-download', id: folderId };
            showPinModal('folder-download');
        } else {
            downloadFolder(folderId, '');
        }
    } catch (error) {
        showToast('Failed to start folder download', 'error');
    }
}

function downloadFile(fileId, pin = '') {
    const url = `/download/${fileId}${pin ? `?pin=${encodeURIComponent(pin)}` : ''}`;
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    hidePinModal();
}

function downloadFolder(folderId, pin = '') {
    const url = `/download-folder/${folderId}${pin ? `?pin=${encodeURIComponent(pin)}` : ''}`;
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    hidePinModal();
}

function showPinModal(actionType = 'file') {
    if (!pinModal || !pinInput) return;
    updatePinModalCopy(actionType);
    pinModal.classList.add('show');
    pinInput.focus();
    document.body.style.overflow = 'hidden';
}

function hidePinModal() {
    if (!pinModal || !pinInput) return;
    pinModal.classList.remove('show');
    pinInput.value = '';
    pendingPinAction = null;
    document.body.style.overflow = '';
}

function handlePinSubmit() {
    if (!pinInput) return;
    const pin = pinInput.value.trim();
    if (!pin) {
        showToast('Please enter a PIN', 'error');
        pinInput.focus();
        return;
    }
    if (pendingPinAction?.type === 'file') {
        downloadFile(pendingPinAction.id, pin);
    } else if (pendingPinAction?.type === 'folder-open') {
        folderNav.cacheFolderPin(pendingPinAction.id, pin);
        folderNav.navigateToFolder(pendingPinAction.id, pendingPinAction.name || '', pin, loadFiles);
        hidePinModal();
    } else if (pendingPinAction?.type === 'folder-download') {
        downloadFolder(pendingPinAction.id, pin);
    }
}

function updatePinModalCopy(actionType) {
    const isFolderOpen = actionType === 'folder-open';
    const isFolderDownload = actionType === 'folder-download';

    if (pinModalTitle) {
        pinModalTitle.textContent = 'Enter PIN';
    }
    if (pinModalDescription) {
        if (isFolderOpen) {
            pinModalDescription.textContent = 'This folder is protected. Please enter the PIN to open:';
        } else if (isFolderDownload) {
            pinModalDescription.textContent = 'This folder is protected. Please enter the PIN to download:';
        } else {
            pinModalDescription.textContent = 'This file is protected. Please enter the PIN to download:';
        }
    }
    if (submitPinButton) {
        submitPinButton.textContent = isFolderOpen ? 'Open' : 'Download';
    }
}