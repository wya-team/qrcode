import qrcode, { createQRCode } from '../src/main';

let img = document.createElement('img');
img.src = createQRCode(`http://www.baidu.com`);

document.body.appendChild(img);

