import qrcode from './qrcode';
export const createQRCode = (url, opts = {}) => {
	let { 
		cellSize = 6, 
		margin = 0, 
		typeNumber = 5,
		errorCorrectionLevel = 'L',
		mime = "image/gif"
	} = opts || {};
	let QR = qrcode(typeNumber, errorCorrectionLevel);
	QR.addData(url);
	QR.make();
	return QR.createBase64(cellSize, margin, mime);
};
export default qrcode;

