(function(window){
    if (!window.qrcode) {
        console.error('qrcode-generator not loaded');
        return;
    }

    function normalizeLevel(level) {
        if (level === 'L' || level === 'M' || level === 'Q' || level === 'H') {
            return level;
        }
        switch (level) {
            case 1: return 'L';
            case 0: return 'M';
            case 3: return 'Q';
            case 2: return 'H';
            default: return 'M';
        }
    }

    function renderToElement(qr, size, container) {
        const cellSize = Math.floor(size / qr.getModuleCount());
        const margin = Math.floor((size - qr.getModuleCount() * cellSize) / 2);
        const canvas = document.createElement('canvas');
        canvas.width = qr.getModuleCount() * cellSize + margin * 2;
        canvas.height = qr.getModuleCount() * cellSize + margin * 2;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        for (let row = 0; row < qr.getModuleCount(); row++) {
            for (let col = 0; col < qr.getModuleCount(); col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(margin + col * cellSize, margin + row * cellSize, cellSize, cellSize);
                }
            }
        }
        container.innerHTML = '';
        container.appendChild(canvas);
    }

    function QRCode(el, options) {
        const opts = options || {};
        const text = opts.text || '';
        const size = Math.min(opts.width || 200, opts.height || 200);
        const container = (typeof el === 'string') ? document.getElementById(el) : el;
        if (!container) throw new Error('Invalid container for QRCode');

        const level = normalizeLevel(opts.correctLevel || QRCode.CorrectLevel.M);
        const qr = window.qrcode(0, level);
        qr.addData(text);
        qr.make();

        renderToElement(qr, size, container);
    }

    QRCode.CorrectLevel = { L: 'L', M: 'M', Q: 'Q', H: 'H' };
    window.QRCode = QRCode;
})(window);
