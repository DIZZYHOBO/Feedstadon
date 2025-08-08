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
            }
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
