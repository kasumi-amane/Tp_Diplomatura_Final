const Formulario = document.getElementById('addPost_Form');
const addPost = document.getElementById('addPost');
const cross = document.getElementById('addPost_cross');
const body = document.body;

addPost.addEventListener('click', function(ev){
    Formulario.classList.add('flex');
    window.scrollTo(0, 0);
    body.style.overflow = 'hidden';
});

cross.addEventListener('click', function(ev){
    Formulario.classList.remove('flex');
    body.style.overflow = 'auto';
});