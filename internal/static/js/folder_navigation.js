(() => {
    const ROOT_ID = "00000000-0000-0000-0000-000000000000";

    const state = {
        currentFolderID: ROOT_ID,
        folderHistory: [],
        folderPinCache: new Map()
    };

    function normalizeFolderPayload(data) {
        if (!data) return { files: [], folders: [] };
        if (Array.isArray(data)) return { files: data, folders: [] };
        if (data && !data.files && !data.folders) {
            return { files: [], folders: [] };
        }
        return {
            files: data.files || [],
            folders: data.folders || []
        };
    }

    function setCurrentFolderID(folderId) {
        state.currentFolderID = folderId || ROOT_ID;
    }

    function getCurrentFolderID() {
        return state.currentFolderID;
    }

    function getFolderHistory() {
        return state.folderHistory;
    }

    function cacheFolderPin(folderId, pin) {
        if (folderId && pin) {
            state.folderPinCache.set(folderId, pin);
        }
    }

    function getCachedPin(folderId) {
        if (!folderId) return '';
        return state.folderPinCache.get(folderId);
    }

    async function fetchFolderContents(folderId, pin = '') {
        const targetId = folderId || ROOT_ID;
        const isRoot = targetId === ROOT_ID;
        const endpoint = isRoot
            ? '/rootfilesandfolders'
            : `/folder/content/${targetId}${pin ? `?pin=${encodeURIComponent(pin)}` : ''}`;

        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error('Failed to fetch folder contents');
        }

        const data = await response.json();
        return normalizeFolderPayload(data);
    }

    function navigateToFolder(folderId, folderName, pin, loadFn) {
        state.folderHistory.push({ id: state.currentFolderID, name: folderName });
        setCurrentFolderID(folderId);
        return loadFn(folderId, pin);
    }

    async function handleFolderNavigation(folderId, folderName, options) {
        if (!options?.checkPin || !options?.loadFn) {
            throw new Error('Folder navigation requires checkPin and loadFn');
        }

        const hasPin = await options.checkPin(folderId);
        if (hasPin) {
            options.onPinRequired?.({ type: 'folder', id: folderId, name: folderName });
            return;
        }
        return navigateToFolder(folderId, folderName, '', options.loadFn);
    }

    function navigateBack(loadFn) {
        if (state.folderHistory.length > 0) {
            const previousFolder = state.folderHistory.pop();
            setCurrentFolderID(previousFolder.id);
            return loadFn(previousFolder.id, '');
        }
        setCurrentFolderID(ROOT_ID);
        return loadFn(ROOT_ID, '');
    }

    window.FolderNav = {
        ROOT_ID,
        normalizeFolderPayload,
        fetchFolderContents,
        setCurrentFolderID,
        getCurrentFolderID,
        getFolderHistory,
        cacheFolderPin,
        getCachedPin,
        navigateToFolder,
        handleFolderNavigation,
        navigateBack
    };
})();
