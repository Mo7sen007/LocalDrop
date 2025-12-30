let currentFolderID = "00000000-0000-0000-0000-000000000000"; // Root folder ID
let folderHistory = []; // Stack to track folder navigation

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

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            updateFileInputDisplay(e.target, 'file');
            // Auto-fill name if single file
            if (e.target.files.length === 1 && fileNameInput) {
                fileNameInput.value = e.target.files[0].name;
            }
            // Disable folder input when files are selected
            if (e.target.files.length > 0 && folderInput) {
                folderInput.disabled = true;
                folderInput.closest('.file-input-wrapper')?.classList.add('disabled');
            } else if (folderInput) {
                folderInput.disabled = false;
                folderInput.closest('.file-input-wrapper')?.classList.remove('disabled');
            }
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
            // Disable file input when folder is selected
            if (e.target.files.length > 0 && fileInput) {
                fileInput.disabled = true;
                fileInput.closest('.file-input-wrapper')?.classList.add('disabled');
            } else if (fileInput) {
                fileInput.disabled = false;
                fileInput.closest('.file-input-wrapper')?.classList.remove('disabled');
            }
        });
    }
});

function updateFileInputDisplay(input, type) {
    const wrapper = input.closest('.file-input-wrapper');
    const textSpan = wrapper.querySelector('.file-text');
    if (!textSpan) return;

    if (input.files && input.files.length > 0) {
        if (input.files.length === 1) {
            textSpan.textContent = input.files[0].name;
        } else {
            textSpan.textContent = `${input.files.length} ${type}s selected`;
        }
        wrapper.classList.add('has-file');
    } else {
        textSpan.textContent = type === 'file' ? 'Choose files...' : 'Choose folder...';
        wrapper.classList.remove('has-file');
    }
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
                    ⬅️ Back to parent folder
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
                row.innerHTML = `
                    <td class="folder-name">📁 ${folder.name}</td>
                    <td>-</td>
                    <td>Folder</td>
                    <td>${new Date(folder.created_at).toLocaleDateString()}</td>
                    <td>
                        <a href="/download-folder/${folder.id}" class="btn-link" onclick="event.stopPropagation()">Download</a>
                        <button onclick="event.stopPropagation(); deleteFolder('${folder.id}', '${folder.name}')" class="btn-link delete">Delete</button>
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
                row.innerHTML = `
                    <td>${file.name}</td>
                    <td>${formatBytes(file.size)}</td>
                    <td>${file.extension || 'file'}</td>
                    <td>${new Date(file.created_at).toLocaleDateString()}</td>
                    <td>
                        <a href="/download/${file.id}" class="btn-link">Download</a>
                        <button onclick="deleteFile('${file.id}', '${file.name}')" class="btn-link delete">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
        table.appendChild(tbody);

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
            ⬅️ Back to parent folder
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
        type = "folders";
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
    const submitBtn = document.getElementById('submitButton');

    // Determine which input has files
    let filesToUpload = null;
    if (fileInput.files && fileInput.files.length > 0) {
        filesToUpload = fileInput.files;
    } else if (folderInput.files && folderInput.files.length > 0) {
        filesToUpload = folderInput.files;
    } else {
        showToast('Please select files or a folder to upload', 'error');
        return;
    }

    const descriptor = analyzeFileInput(filesToUpload);

    const formData = new FormData();
    formData.append('folderId', currentFolderID);
    formData.append('pinCode', pinInput.value || '');
    formData.append('type', descriptor.type);

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
            
            // Re-enable both inputs
            fileInput.disabled = false;
            folderInput.disabled = false;
            fileInput.closest('.file-input-wrapper')?.classList.remove('disabled');
            folderInput.closest('.file-input-wrapper')?.classList.remove('disabled');
            
            // Reset input displays
            updateFileInputDisplay(fileInput, 'file');
            updateFileInputDisplay(folderInput, 'folder');
            
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