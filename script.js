function init() {
    const updateButton = document.getElementById('updateButton');
    updateButton.addEventListener('click', handleUpdateClick);
}

function handleUpdateClick() {
    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            render(data);
        })
        .catch(error => {
            console.error('Failed to load JSON:', error);
            const weekData = [ /* hardcoded weekData */ ];
            render(weekData);
        });
}

function render(data) {
    // Rendering logic goes here
}