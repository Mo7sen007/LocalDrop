(function(){
    const Share = {};

    function ensureModal(){
        let modal = document.getElementById('shareModal');
        if(modal) return modal;

        modal = document.createElement('div');
        modal.id = 'shareModal';
        modal.className = 'modal';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header flex items-center justify-between px-6 py-4 border-b-2 border-slate-900 bg-slate-100">
                    <h3 class="font-display text-sm">Share</h3>
                    <button id="shareClose" class="modal-close text-xl">&times;</button>
                </div>
                <div class="modal-body p-6 space-y-4">
                    <div id="qrContainer" class="flex items-center justify-center py-2"></div>
                    <input id="shareUrlInput" class="retro-input" readonly />
                    <div class="flex flex-wrap gap-3 justify-end">
                        <button id="copyShareBtn" class="retro-btn secondary">Copy Link</button>
                        <button id="nativeShareBtn" class="retro-btn primary">Share</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => { if(e.target === modal) hideModal(); });
        document.getElementById('shareClose').addEventListener('click', hideModal);
        document.getElementById('copyShareBtn').addEventListener('click', copyLink);
        document.getElementById('nativeShareBtn').addEventListener('click', nativeShare);
        return modal;
    }

    function showModalFor(url, title){
        const modal = ensureModal();
        const qrContainer = modal.querySelector('#qrContainer');
        const urlInput = modal.querySelector('#shareUrlInput');
        qrContainer.innerHTML = '';
        urlInput.value = url;

        // Use vendored QRCode (qrcode.js) to render
        try{
            new QRCode(qrContainer, { text: url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.H });
        }catch(err){
            // Fallback: show plain link
            qrContainer.textContent = url;
            console.error('QR generation failed:', err);
        }

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function hideModal(){
        const modal = document.getElementById('shareModal');
        if(!modal) return;
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    async function copyLink(){
        const input = document.querySelector('#shareUrlInput');
        if(!input) return;
        try{
            await navigator.clipboard.writeText(input.value);
            // small feedback
            input.style.transition = 'background 0.2s';
            input.style.background = '#d1fae5';
            setTimeout(()=> input.style.background = '', 800);
        }catch(e){
            alert('Copy failed');
        }
    }

    async function nativeShare(){
        const input = document.querySelector('#shareUrlInput');
        if(!input) return;
        if(navigator.share){
            try{
                await navigator.share({ title: document.title, url: input.value });
            }catch(e){ /* user cancelled */ }
        }else{
            copyLink();
            alert('Link copied to clipboard');
        }
    }

    Share.show = showModalFor;
    Share.hide = hideModal;
    window.Share = Share;
})();
