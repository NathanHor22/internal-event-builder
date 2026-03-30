const TagSelector = {
    create({ items, selected = [], onToggle }) {
        const container = document.createElement('div');
        container.className = 'chip-list';
        items.forEach(item => {
            const chip = document.createElement('div');
            chip.className = `chip${selected.includes(item.value) ? ' selected' : ''}`;
            chip.textContent = item.label;
            chip.addEventListener('click', () => {
                chip.classList.toggle('selected');
                onToggle(item.value, chip.classList.contains('selected'));
            });
            container.appendChild(chip);
        });
        return container;
    }
};
