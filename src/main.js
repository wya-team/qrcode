import qrcode from './qrcode';
export const createQRCode = (url, opts = {}) => {
	let { 
		cellSize = 6, 
		margin = 0, 
		typeNumber = 15,
		errorCorrectionLevel = 'L' 
	} = opts || {};
	let QR = qrcode(typeNumber, errorCorrectionLevel);
	QR.addData(url);
	QR.make();
	return QR.createBase64(cellSize, margin);
};
export default qrcode;

