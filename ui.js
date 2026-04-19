document.querySelectorAll('configTitle').forEach(section => {
    section.addEventListener('click', function(e) {
            this.parentElement.classList.toggle('expand');
            this.parentElement.classList.toggle('collapse');
    });
});