(function() {
    // Create diagnostic UI container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.bottom = '10px';
    container.style.right = '10px';
    container.style.maxWidth = '380px';
    container.style.maxHeight = '220px';
    container.style.overflowY = 'auto';
    container.style.backgroundColor = 'rgba(244, 67, 54, 0.95)';
    container.style.color = '#ffffff';
    container.style.padding = '12px';
    container.style.borderRadius = '8px';
    container.style.fontFamily = 'Consolas, monospace';
    container.style.fontSize = '12px';
    container.style.zIndex = '99999';
    container.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)';
    container.style.display = 'none';
    container.id = 'debug-console-log';

    document.body.appendChild(container);

    function logError(msg, source, line) {
        container.style.display = 'block';
        const div = document.createElement('div');
        div.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
        div.style.padding = '6px 0';
        div.style.wordBreak = 'break-all';
        
        let file = '';
        if (source) {
            file = source.split('/').pop().split('?')[0];
        }
        
        div.innerHTML = `<strong>Error:</strong> ${msg}<br><small style="opacity:0.8;">${file ? file + ' (Line ' + line + ')' : ''}</small>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // Capture global script execution errors
    window.onerror = function(message, source, lineno, colno, error) {
        logError(message, source, lineno);
        return false;
    };

    // Capture console.error statements
    const originalError = console.error;
    console.error = function() {
        originalError.apply(console, arguments);
        const args = Array.from(arguments).map(a => {
            if (a instanceof Error) return a.message + '\n' + a.stack;
            return typeof a === 'object' ? JSON.stringify(a) : String(a);
        });
        logError(args.join(' '));
    };

    console.log("Diagnostic console loaded. Checking for errors...");
})();
