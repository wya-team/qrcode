import qrcode, { createQRCode } from '../src/main';
// ele
let input = document.createElement('input');
let img = document.createElement('img');

document.body.appendChild(input);
document.body.appendChild(img);

img.src = createQRCode('github.com');

let timer = null;
input.onkeydown = (e) => {
	timer && clearTimeout(timer);
	timer = setTimeout(() => {
		img.src = createQRCode(e.target.value);
	}, 300);
};
