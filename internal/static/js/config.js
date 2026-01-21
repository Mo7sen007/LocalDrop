const form = document.getElementById('configForm');
const resetBtn = document.getElementById('resetBtn');
const alertBox = document.getElementById('alert');
const alertContent = document.getElementById('alertContent');

const fields = {
    port: document.getElementById('port'),
    maxSize: document.getElementById('maxSize'),
    basePath: document.getElementById('basePath'),
    authEnabled: document.getElementById('authEnabled'),
    loggingEnabled: document.getElementById('loggingEnabled'),
    loggingLevel: document.getElementById('loggingLevel')
};

let initialConfig = null;

function showAlert(message, type = 'info') {
    if (!alertBox || !alertContent) return;
    alertBox.classList.remove('hidden');
    alertContent.className = 'retro-card-sm px-4 py-3 font-semibold';

    if (type === 'success') {
        alertContent.classList.add('bg-emerald-300');
    } else if (type === 'error') {
        alertContent.classList.add('bg-rose-300');
    } else {
        alertContent.classList.add('bg-sky-300');
    }

    alertContent.textContent = message;
}

function hideAlert() {
    if (!alertBox) return;
    alertBox.classList.add('hidden');
}

function bytesToMb(bytes) {
    return Math.max(1, Math.round(bytes / (1024 * 1024)));
}

function mbToBytes(mb) {
    return Math.round(Number(mb) * 1024 * 1024);
}

function populateForm(config) {
    if (!config) return;
    const server = config.server ?? config.App ?? {};
    const storage = config.storage ?? config.Storage ?? {};
    const auth = config.auth ?? config.Auth ?? {};
    const logging = config.logging ?? config.Logging ?? {};

    fields.port.value = server.port ?? server.Port ?? '';
    fields.basePath.value = storage.base_path ?? storage.BasePath ?? '';
    fields.maxSize.value = bytesToMb(storage.max_size ?? storage.MaxFileSize ?? 0);
    fields.authEnabled.checked = !!(auth.authentication ?? auth.Enabled);
    fields.loggingEnabled.checked = !!(logging.logging ?? logging.Enabled);
    fields.loggingLevel.value = logging.logging_level ?? logging.Level ?? 'info';
}

async function loadConfig() {
    try {
        hideAlert();
        const response = await fetch('/config/api');
        if (!response.ok) {
            throw new Error('Failed to load config');
        }
        const data = await response.json();
        initialConfig = data;
        populateForm(data);
    } catch (error) {
        showAlert('Failed to load config. Please refresh.', 'error');
        console.error(error);
    }
}

async function saveConfig(payload) {
    const response = await fetch('/config/api', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.error || 'Failed to save config';
        throw new Error(message);
    }

    return response.json().catch(() => ({}));
}

form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
        server: {
            port: Number(fields.port.value)
        },
        storage: {
            base_path: fields.basePath.value.trim(),
            max_size: mbToBytes(fields.maxSize.value)
        },
        auth: {
            authentication: fields.authEnabled.checked
        },
        logging: {
            logging: fields.loggingEnabled.checked,
            logging_level: fields.loggingLevel.value
        }
    };

    try {
        await saveConfig(payload);
        showAlert('Config saved. Some changes require a restart.', 'success');
        initialConfig = payload;
    } catch (error) {
        showAlert(error.message || 'Failed to save config', 'error');
    }
});

resetBtn?.addEventListener('click', () => {
    if (!initialConfig) return;
    populateForm(initialConfig);
    showAlert('Changes reset.', 'info');
});

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn?.addEventListener('click', async () => {
    try {
        await fetch('/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        window.location.href = '/login';
    }
});

loadConfig();
