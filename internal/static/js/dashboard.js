let currentFolderID = "00000000-0000-0000-0000-000000000000"; // Root folder ID
let folderHistory = []; // Stack to track folder navigation
let currentUploadDescriptor = null;

document.addEventListener('DOMContentLoaded', () => {
    loadFiles();

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => loadFiles(currentFolderID));

    // File Input Listeners
    const fileInput = document.getElementById('fileEl');
    const folderInput = document.getElementById('folderEl');
    const fileNameInput = document.getElementById('fileName');
    const dropzone = document.getElementById('fileDropzone');
    const dropText = document.getElementById('fileDropText');
    const pickFilesBtn = document.getElementById('pickFilesBtn');
    const pickFolderBtn = document.getElementById('pickFolderBtn');

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

async function loadFiles(folderId = null) {
    const table = document.getElementById('tableOfContent');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');

    // If no folderId provided, use root
    if (!folderId) {
        folderId = "00000000-0000-0000-0000-000000000000";
    }

    // Update current folder ID
    currentFolderID = folderId;

    if (loading) loading.style.display = 'block';
    if (table) table.innerHTML = '';
    if (emptyState) emptyState.style.display = 'none';

    try {
        // Determine which endpoint to use
        const isRoot = folderId === "00000000-0000-0000-0000-000000000000";
        const endpoint = isRoot ? '/rootfilesandfolders' : `/folder/content/${folderId}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch files');

        let data = await response.json();
        
        // Handle null response from empty DB
        if (!data) data = { files: [], folders: [] };
        // If data is an array (legacy), wrap it
        if (Array.isArray(data)) data = { files: data, folders: [] };
        // If data is a map (legacy), convert to array
        if (data && !data.files && !Array.isArray(data)) {
             if (!data.files) data.files = [];
             if (!data.folders) data.folders = [];
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
        if (!isRoot && folderHistory.length > 0) {
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
                row.innerHTML = `
                    <td class="name-cell">
                        <div class="name-stack">
                            <i class="fa-solid fa-folder" aria-hidden="true"></i>
                            <span class="name-text" title="${fullName}">${displayName}</span>
                        </div>
                    </td>
                    <td>-</td>
                    <td>Folder</td>
                    <td>${new Date(folder.created_at).toLocaleDateString()}</td>
                    <td>
                        <a href="/download-folder/${folder.id}" class="btn-link primary" onclick="event.stopPropagation()">Download</a>
                        <button onclick="event.stopPropagation(); deleteFolder('${folder.id}', '${safeNameForJs}')" class="btn-link delete">Delete</button>
                    </td>
                `;
                // Make the entire row clickable to open the folder
                row.onclick = (e) => {
                    // Only navigate if not clicking on action buttons
                    if (!e.target.closest('.btn-link') && !e.target.closest('button')) {
                        navigateToFolder(folder.id, folder.name);
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
                        <a href="/download/${file.id}" class="btn-link primary">Download</a>
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

function navigateToFolder(folderId, folderName) {
    // Add current folder to history before navigating
    folderHistory.push({
        id: currentFolderID,
        name: folderName
    });
    
    // Load the new folder
    loadFiles(folderId);
}

function navigateBack() {
    if (folderHistory.length > 0) {
        // Pop the last folder from history
        const previousFolder = folderHistory.pop();
        
        // Load the previous folder
        loadFiles(previousFolder.id);
    } else {
        // If no history, go to root
        loadFiles("00000000-0000-0000-0000-000000000000");
    }
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
    
    const fileInput = document.getElementById('fileEl');
    const folderInput = document.getElementById('folderEl');
    const pinInput = document.getElementById('pinCode');
    const fileNameInput = document.getElementById('fileName');
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
    formData.append('folderId', currentFolderID);
    formData.append('pinCode', pinInput.value || '');
    formData.append('type', descriptor.type);
    if (descriptor.type === 'file' && fileNameInput?.value) {
        formData.append('fileName', fileNameInput.value.trim());
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
            
            loadFiles(currentFolderID); // Refresh current folder
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
            loadFiles(currentFolderID); // Reload current folder
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
            loadFiles(currentFolderID); // Reload current folder
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