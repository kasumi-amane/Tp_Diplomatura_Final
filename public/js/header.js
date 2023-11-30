        const menu = document.getElementById('menu');
        const menuBody = document.getElementById('menu_body');


        menu.addEventListener('click', function(ev){
            menuBody.classList.add('flex');
        });

        document.addEventListener('click', function(ev) {
            if (!menu.contains(ev.target)) {
                menuBody.classList.remove('flex');
            }
        });
