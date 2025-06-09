document.addEventListener('DOMContentLoaded', function () {
    const keyInput = document.getElementById('key');
    const toggleButton = document.getElementById('toggleKeyVisibility');

    if (keyInput && toggleButton) {
        const eyeOpenIcon = toggleButton.querySelector('.eye-open');
        const eyeClosedIcon = toggleButton.querySelector('.eye-closed');

        toggleButton.addEventListener('click', function () {
            const type = keyInput.getAttribute('type') === 'password' ? 'text' : 'password';
            keyInput.setAttribute('type', type);
            if (type === 'password') {
                if (eyeOpenIcon) eyeOpenIcon.style.display = 'inline';
                if (eyeClosedIcon) eyeClosedIcon.style.display = 'none';
            } else {
                if (eyeOpenIcon) eyeOpenIcon.style.display = 'none';
                if (eyeClosedIcon) eyeClosedIcon.style.display = 'inline';
            }
        });
    }
});
