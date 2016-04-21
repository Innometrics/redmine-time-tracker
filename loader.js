(function (baseUrl) {
    var files = [
        'main.css',
        'timer.js'
    ];

    files.forEach(function (file) {
        var extns = file.match(/\.(\w{2,4})$/),
            el;

        extns = extns && extns[1];
        if (!extns) {
            return;
        }

        switch (extns) {
            case 'js':
                el = document.createElement('script');
                el.type = 'text/javascript';
                el.src = baseUrl + file;

                document.head.appendChild(el);
                break;
            case 'css':
                el = document.createElement('link');
                el.rel = 'stylesheet';
                el.href = baseUrl + file;

                document.head.appendChild(el);
                break;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                el = document.createElement('img');
                el.src = baseUrl + file;
                el.style.display = 'none';

                document.body.appendChild(el);
                break;
            default:
                break;
        }
    });
})(window.rttBaseUrl);
