const EditableCell = {
    create({ value, field, contentId, type = 'text', options = null, onSave }) {
        const container = document.createElement('div');
        container.className = 'editable-cell';

        const display = document.createElement('div');
        if (type === 'textarea') {
            display.className = 'expandable-text';
            display.textContent = value || '(empty)';
            if (!value) display.style.color = 'var(--text-muted)';
        } else {
            display.textContent = value || '(empty)';
            if (!value) display.style.color = 'var(--text-muted)';
        }
        container.appendChild(display);

        container.addEventListener('click', () => {
            if (container.classList.contains('editing')) return;
            container.classList.add('editing');
            container.innerHTML = '';

            let input;
            if (type === 'select' && options) {
                input = document.createElement('select');
                options.forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt.value;
                    o.textContent = opt.label;
                    if (opt.value === value) o.selected = true;
                    input.appendChild(o);
                });
            } else if (type === 'textarea') {
                input = document.createElement('textarea');
                input.value = value || '';
                input.rows = 4;
            } else if (type === 'number') {
                input = document.createElement('input');
                input.type = 'number';
                input.value = value || '';
                input.step = 'any';
            } else if (type === 'date') {
                input = document.createElement('input');
                input.type = 'date';
                input.value = value || '';
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.value = value || '';
            }
            container.appendChild(input);
            input.focus();
            if (input.select && type !== 'select') input.select();

            const save = async () => {
                const newVal = type === 'number' ? (input.value ? parseFloat(input.value) : null) : input.value;
                container.classList.remove('editing');
                if (newVal !== value) {
                    try {
                        await API.updateContent(contentId, { [field]: newVal });
                        if (onSave) onSave(newVal);
                        value = newVal;
                    } catch (err) {
                        Toast.error('Failed to save: ' + err.message);
                    }
                }
                container.innerHTML = '';
                const newDisplay = document.createElement('div');
                if (type === 'textarea') newDisplay.className = 'expandable-text';
                newDisplay.textContent = value || '(empty)';
                if (!value) newDisplay.style.color = 'var(--text-muted)';
                container.appendChild(newDisplay);
            };

            input.addEventListener('blur', save);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && type !== 'textarea') save();
                if (e.key === 'Escape') {
                    container.classList.remove('editing');
                    container.innerHTML = '';
                    const d = document.createElement('div');
                    if (type === 'textarea') d.className = 'expandable-text';
                    d.textContent = value || '(empty)';
                    if (!value) d.style.color = 'var(--text-muted)';
                    container.appendChild(d);
                }
            });
            if (type === 'select') input.addEventListener('change', save);
        });

        return container;
    }
};
