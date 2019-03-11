import qrcode, { createQRCode } from '../src/index';
// ele
let input = document.createElement('input');
let img = document.createElement('img');

Object.entries({
	display: "block",
	margin: "5px"
}).forEach(item => input.style[item[0]] = item[1]);
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
