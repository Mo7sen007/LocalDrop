let currentFolderID = "00000000-0000-0000-0000-000000000000";

document.addEventListener('DOMContentLoaded', () => {
    loadFiles();

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', loadFiles);

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

async function loadFiles() {
    const table = document.getElementById('tableOfContent');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');

    if (loading) loading.style.display = 'block';
    if (table) table.innerHTML = '';
    if (emptyState) emptyState.style.display = 'none';

    try {
        const response = await fetch('/listOfFiles');
        if (!response.ok) throw new Error('Failed to fetch files');

        let data = await response.json();
        console.log('Fetched data:', data);
        
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
        
        // Render Folders
        if (data.folders) {
            data.folders.forEach(folder => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>📁 ${folder.name}</td>
                    <td>-</td>
                    <td>Folder</td>
                    <td>${new Date(folder.created_at).toLocaleDateString()}</td>
                    <td>
                        <a href="/download-folder/${folder.id}" class="btn-link">Download</a>
                        <button onclick="deleteFolder('${folder.id}', '${folder.name}')" class="btn-link delete">Delete</button>
                    </td>
                `;
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



async function handleUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('fileEl');
    //const folderInput = document.getElementById('folderEl');
    const pinInput = document.getElementById('pinCode');
    const submitBtn = document.getElementById('submitButton');

    const formData = new FormData();
    let hasFiles = false;
    formData.append('folderId',currentFolderID) //important
    // 1. Add standard files
    if (fileInput.files.length > 0) {
        for (const file of fileInput.files) {
            formData.append('files', file);
            // For regular files, path is just the /name
            formData.append('paths', "/" + file.name);
        }
        hasFiles = true;
    }

    // 2. Add folder files
    if (folderInput.files.length > 0) {
        for (const file of folderInput.files) {
            formData.append('files', file);
            // webkitRelativePath contains "Folder/Sub/File.txt"
            formData.append('paths', file.webkitRelativePath);
        }
        hasFiles = true;
    }

    if (!hasFiles) {
        showToast('Please select at least one file or folder.', 'error');
        return;
    }

    formData.append('pinCode', pinInput.value);

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
            fileInput.value = '';
            folderInput.value = '';
            pinInput.value = '';
            loadFiles(); // Refresh list
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
        const response = await fetch(`/delete/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('File deleted', 'success');
            loadFiles();
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteFolder(id, name) {
    if (!confirm(`Are you sure you want to delete folder "${name}" and all its contents?`)) return;
    // Note: You need to implement /deleteFolder/:id endpoint in backend
    alert("Delete folder not implemented yet in backend");
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