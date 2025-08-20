document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.theme-inputs input');
    const root = document.documentElement;

    function updatePreview() {
        inputs.forEach(input => {
            root.style.setProperty(`--${input.id}`, input.value);
        });
    }

    inputs.forEach(input => {
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                updatePreview();
            }document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.theme-inputs input');
    const root = document.documentElement;

    // Define all theme variables
    const themeVars = [
        'bg-color',
        'card-color',
        'primary-color',
        'accent-color',
        'font-color',
        'font-color-muted',
        'border-color',
        'link-color',
        'hover-color',
        'success-color',
        'error-color',
        'warning-color',
        'info-color',
        'border-radius'
    ];

    function updatePreview() {
        inputs.forEach(input => {
            const value = input.value;
            if (input.type === 'color') {
                root.style.setProperty(`--${input.id}`, value);
            } else if (input.type === 'text') {
                root.style.setProperty(`--${input.id}`, value);
            }
        });
    }

    // Real-time preview updates
    inputs.forEach(input => {
        if (input.type === 'color') {
            input.addEventListener('input', updatePreview);
        } else {
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter' || input.value !== input.dataset.lastValue) {
                    input.dataset.lastValue = input.value;
                    updatePreview();
                }
            });
            input.addEventListener('blur', updatePreview);
        }
    });

    // Generate theme CSS
    document.getElementById('print-theme-btn').addEventListener('click', () => {
        const themeName = prompt("Enter a name for your new theme (e.g., 'darkblue'):", "mytheme");
        if (!themeName) return;

        const cleanThemeName = themeName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        let cssString = `/* Theme: ${themeName} */\n`;
        cssString += `[data-theme="${cleanThemeName}"] {\n`;
        
        themeVars.forEach(varName => {
            const input = document.getElementById(varName);
            if (input) {
                const value = input.value;
                cssString += `    --${varName}: ${value};\n`;
            }
        });
        
        cssString += `}\n\n`;
        
        // Add theme-specific enhancements if needed
        cssString += `/* Optional theme-specific enhancements */\n`;
        cssString += `[data-theme="${cleanThemeName}"] .status {\n`;
        cssString += `    /* Add any theme-specific overrides here */\n`;
        cssString += `}`;
        
        document.getElementById('output-css').value = cssString;
        
        // Also show instructions
        const instructions = `\n\n/* Instructions:\n`;
        const instructions2 = ` * 1. Copy this CSS and add it to your style.css file\n`;
        const instructions3 = ` * 2. Add "${cleanThemeName}" to your themes.list file\n`;
        const instructions4 = ` * 3. The theme will appear in Settings automatically\n`;
        const instructions5 = ` */`;
        
        document.getElementById('output-css').value += instructions + instructions2 + instructions3 + instructions4 + instructions5;
    });

    // Copy CSS to clipboard
    document.getElementById('copy-css-btn').addEventListener('click', () => {
        const outputCss = document.getElementById('output-css');
        outputCss.select();
        document.execCommand('copy');
        
        // Visual feedback
        const btn = document.getElementById('copy-css-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.backgroundColor = 'var(--success-color)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
        }, 2000);
    });

    // Import theme from CSS
    document.getElementById('import-theme-btn').addEventListener('click', () => {
        const cssString = document.getElementById('output-css').value;
        
        if (!cssString.trim()) {
            alert('Please paste a theme CSS in the text area first');
            return;
        }
        
        // Parse CSS variables
        const regex = /--([a-zA-Z-]+):\s*([^;]+);/g;
        let match;
        let imported = 0;
        
        while ((match = regex.exec(cssString)) !== null) {
            const varName = match[1];
            const varValue = match[2].trim();
            const inputElement = document.getElementById(varName);
            
            if (inputElement) {
                if (inputElement.type === 'color') {
                    // Convert to hex if necessary
                    if (varValue.startsWith('#')) {
                        inputElement.value = varValue;
                    } else if (varValue.startsWith('rgb')) {
                        // Convert RGB to hex (basic conversion)
                        const rgb = varValue.match(/\d+/g);
                        if (rgb && rgb.length >= 3) {
                            const hex = '#' + rgb.slice(0, 3).map(x => {
                                const hex = parseInt(x).toString(16);
                                return hex.length === 1 ? '0' + hex : hex;
                            }).join('');
                            inputElement.value = hex;
                        }
                    }
                } else {
                    inputElement.value = varValue;
                }
                imported++;
            }
        }
        
        if (imported > 0) {
            updatePreview();
            alert(`Successfully imported ${imported} theme properties!`);
        } else {
            alert('No valid theme properties found in the CSS');
        }
    });

    // Add to themes.list
    document.getElementById('add-to-list-btn').addEventListener('click', () => {
        const cssString = document.getElementById('output-css').value;
        
        if (!cssString.includes('[data-theme=')) {
            alert('Please generate a theme first');
            return;
        }
        
        // Extract theme name
        const themeMatch = cssString.match(/\[data-theme="([^"]+)"\]/);
        if (themeMatch) {
            const themeName = themeMatch[1];
            
            // Create download link for updated themes.list
            const content = `feedstodon\nreadit\ngit\nvoyage\n${themeName}`;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'themes.list';
            
            // Show instructions
            const instructions = `Theme "${themeName}" ready to add!\n\n`;
            const instructions2 = `1. This will download an updated themes.list file\n`;
            const instructions3 = `2. Replace your existing themes.list with this file\n`;
            const instructions4 = `3. Add the CSS (already in the text area) to your style.css\n\n`;
            const instructions5 = `Click OK to download the updated themes.list`;
            
            if (confirm(instructions + instructions2 + instructions3 + instructions4 + instructions5)) {
                a.click();
            }
            
            URL.revokeObjectURL(url);
        }
    });

    // Preset themes for quick testing
    const presets = {
        'Feedstodon': {
            'bg-color': '#191b22',
            'card-color': '#282c37',
            'primary-color': '#282c37',
            'accent-color': '#595aff',
            'font-color': '#9baec8',
            'font-color-muted': '#606984',
            'border-color': '#393f4f',
            'link-color': '#595aff'
        },
        'Reddit': {
            'bg-color': '#0b1416',
            'card-color': '#1a282d',
            'primary-color': '#1a282d',
            'accent-color': '#ff4500',
            'font-color': '#ffffff',
            'font-color-muted': '#8b9a9c',
            'border-color': '#2d3436',
            'link-color': '#4fbcff'
        },
        'GitHub': {
            'bg-color': '#0d1117',
            'card-color': '#161b22',
            'primary-color': '#161b22',
            'accent-color': '#58a6ff',
            'font-color': '#c9d1d9',
            'font-color-muted': '#8b949e',
            'border-color': '#30363d',
            'link-color': '#58a6ff'
        },
        'Voyage': {
            'bg-color': '#1a1625',
            'card-color': '#241f31',
            'primary-color': '#241f31',
            'accent-color': '#b794f4',
            'font-color': '#e2e8f0',
            'font-color-muted': '#a0aec0',
            'border-color': '#4a5568',
            'link-color': '#9f7aea'
        }
    };

    // Add preset buttons
    const presetsContainer = document.createElement('div');
    presetsContainer.innerHTML = '<h3>Quick Presets</h3>';
    presetsContainer.style.marginBottom = '20px';
    
    const presetsButtons = document.createElement('div');
    presetsButtons.style.display = 'flex';
    presetsButtons.style.gap = '5px';
    presetsButtons.style.flexWrap = 'wrap';
    presetsButtons.style.marginBottom = '20px';
    
    Object.keys(presets).forEach(presetName => {
        const btn = document.createElement('button');
        btn.textContent = presetName;
        btn.style.flex = '1';
        btn.style.minWidth = '80px';
        btn.style.padding = '8px';
        btn.style.fontSize = '12px';
        btn.onclick = () => {
            const preset = presets[presetName];
            Object.keys(preset).forEach(varName => {
                const input = document.getElementById(varName);
                if (input) {
                    input.value = preset[varName];
                }
            });
            updatePreview();
        };
        presetsButtons.appendChild(btn);
    });
    
    presetsContainer.appendChild(presetsButtons);
    
    // Insert presets before theme inputs
    const themeInputs = document.querySelector('.theme-inputs');
    themeInputs.parentNode.insertBefore(presetsContainer, themeInputs);

    // Initial load
    updatePreview();
});
        });
    });

    document.getElementById('print-theme-btn').addEventListener('click', () => {
        const themeName = prompt("Enter a name for your new theme (e.g., 'sunset'):", "my-theme");
        if (!themeName) return;

        let cssString = `[data-theme="${themeName}"] {\n`;
        inputs.forEach(input => {
            cssString += `    --${input.id}: ${input.value};\n`;
        });
        cssString += `}`;
        
        document.getElementById('output-css').value = cssString;
    });

    document.getElementById('copy-css-btn').addEventListener('click', () => {
        const outputCss = document.getElementById('output-css');
        outputCss.select();
        document.execCommand('copy');
        alert('CSS copied to clipboard!');
    });

    document.getElementById('import-theme-btn').addEventListener('click', () => {
        const cssString = document.getElementById('output-css').value;
        const regex = /--([a-zA-Z-]+):\s*(#[a-fA-F0-9]{3,6}|[a-zA-Z]+);/g;
        let match;
        
        while ((match = regex.exec(cssString)) !== null) {
            const varName = match[1];
            const varValue = match[2];
            const inputElement = document.getElementById(varName);
            if (inputElement) {
                inputElement.value = varValue;
            }
        }
        updatePreview();
    });

    // Initial load
    updatePreview();
});
