import { QRMode, QRErrorCorrectionLevel, QRMaskPattern } from './constants';
import { QRNumber, QRKanji, QRAlphaNum, QR8BitByte, QRBitBuffer } from './transform';
import { QRPolynomial } from './polynomial';
import { createImgTag, stringToBytes, createStringToBytes } from './output';
import {  
	getLostPoint,
	getPatternPosition,
	getBCHTypeNumber,
	getBCHTypeInfo,
	getMaskFunction,
	getErrorCorrectPolynomial,
	getLengthInBits
} from './utils';
import { getRSBlocks } from './RSBlock';
// import { makeImpl, getBestMaskPattern } from './makeImpl';
/**
 * qrcode
 * @param typeNumber 1 to 40
 * @param errorCorrectionLevel 'L','M','Q','H'
 */
export const qrcode = (typeNumber, errorCorrectionLevel) => {
	let PAD0 = 0xEC;
	let PAD1 = 0x11;
	let _typeNumber = typeNumber;
	let _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
	let _modules = null;
	let _moduleCount = 0;
	let _dataCache = null;
	let _dataList = [];
	let _this = {};
	const setupPositionProbePattern = (row, col) => {
		for (let r = -1; r <= 7; r += 1) {
			if (row + r <= -1 || _moduleCount <= row + r) continue;
			for (let c = -1; c <= 7; c += 1) {
				if (col + c <= -1 || _moduleCount <= col + c) continue;
				if ((0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
					_modules[row + r][col + c] = true;
				}
				else {
					_modules[row + r][col + c] = false;
				}
			}
		}
	};
	const getBestMaskPattern = () => {
		let minLostPoint = 0;
		let pattern = 0;
		for (let i = 0; i < 8; i += 1) {
			makeImpl(true, i);
			let lostPoint = getLostPoint(_this);
			if (i == 0 || minLostPoint > lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
		return pattern;
	};
	const setupTimingPattern = () => {
		for (let r = 8; r < _moduleCount - 8; r += 1) {
			if (_modules[r][6] != null) {
				continue;
			}
			_modules[r][6] = (r % 2 == 0);
		}
		for (let c = 8; c < _moduleCount - 8; c += 1) {
			if (_modules[6][c] != null) {
				continue;
			}
			_modules[6][c] = (c % 2 == 0);
		}
	};
	const setupPositionAdjustPattern = () => {
		let pos = getPatternPosition(_typeNumber);
		for (let i = 0; i < pos.length; i += 1) {
			for (let j = 0; j < pos.length; j += 1) {
				let row = pos[i];
				let col = pos[j];
				if (_modules[row][col] != null) {
					continue;
				}
				for (let r = -2; r <= 2; r += 1) {
					for (let c = -2; c <= 2; c += 1) {
						if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
							_modules[row + r][col + c] = true;
						}
						else {
							_modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	};
	const setupTypeNumber = (test) => {
		let bits = getBCHTypeNumber(_typeNumber);
		for (let i = 0; i < 18; i += 1) {
			let mod = (!test && ((bits >> i) & 1) == 1);
			_modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
		}
		for (let i = 0; i < 18; i += 1) {
			let mod = (!test && ((bits >> i) & 1) == 1);
			_modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
		}
	};
	const setupTypeInfo = (test, maskPattern) => {
		let data = (_errorCorrectionLevel << 3) | maskPattern;
		let bits = getBCHTypeInfo(data);
		// vertical
		for (let i = 0; i < 15; i += 1) {
			let mod = (!test && ((bits >> i) & 1) == 1);
			if (i < 6) {
				_modules[i][8] = mod;
			}
			else if (i < 8) {
				_modules[i + 1][8] = mod;
			}
			else {
				_modules[_moduleCount - 15 + i][8] = mod;
			}
		}
		// horizontal
		for (let i = 0; i < 15; i += 1) {
			let mod = (!test && ((bits >> i) & 1) == 1);
			if (i < 8) {
				_modules[8][_moduleCount - i - 1] = mod;
			}
			else if (i < 9) {
				_modules[8][15 - i - 1 + 1] = mod;
			}
			else {
				_modules[8][15 - i - 1] = mod;
			}
		}
		// fixed module
		_modules[_moduleCount - 8][8] = (!test);
	};


	let mapData = (data, maskPattern) => {
		let inc = -1;
		let row = _moduleCount - 1;
		let bitIndex = 7;
		let byteIndex = 0;
		let maskFunc = getMaskFunction(maskPattern);
		for (let col = _moduleCount - 1; col > 0; col -= 2) {
			if (col == 6) col -= 1;
			while (true) {
				for (let c = 0; c < 2; c += 1) {
					if (_modules[row][col - c] == null) {
						let dark = false;
						if (byteIndex < data.length) {
							dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
						}
						let mask = maskFunc(row, col - c);
						if (mask) {
							dark = !dark;
						}
						_modules[row][col - c] = dark;
						bitIndex -= 1;
						if (bitIndex == -1) {
							byteIndex += 1;
							bitIndex = 7;
						}
					}
				}
				row += inc;
				if (row < 0 || _moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
	};
	const createBytes = (buffer, rsBlocks) => {
		let offset = 0;
		let maxDcCount = 0;
		let maxEcCount = 0;
		let dcdata = new Array(rsBlocks.length);
		let ecdata = new Array(rsBlocks.length);
		for (let r = 0; r < rsBlocks.length; r += 1) {
			let dcCount = rsBlocks[r].dataCount;
			let ecCount = rsBlocks[r].totalCount - dcCount;
			maxDcCount = Math.max(maxDcCount, dcCount);
			maxEcCount = Math.max(maxEcCount, ecCount);
			dcdata[r] = new Array(dcCount);
			for (let i = 0; i < dcdata[r].length; i += 1) {
				dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
			}
			offset += dcCount;
			let rsPoly = getErrorCorrectPolynomial(ecCount);
			let rawPoly = QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
			let modPoly = rawPoly.mod(rsPoly);
			ecdata[r] = new Array(rsPoly.getLength() - 1);
			for (let i = 0; i < ecdata[r].length; i += 1) {
				let modIndex = i + modPoly.getLength() - ecdata[r].length;
				ecdata[r][i] = (modIndex >= 0) ? modPoly.getAt(modIndex) : 0;
			}
		}
		let totalCodeCount = 0;
		for (let i = 0; i < rsBlocks.length; i += 1) {
			totalCodeCount += rsBlocks[i].totalCount;
		}
		let data = new Array(totalCodeCount);
		let index = 0;
		for (let i = 0; i < maxDcCount; i += 1) {
			for (let r = 0; r < rsBlocks.length; r += 1) {
				if (i < dcdata[r].length) {
					data[index] = dcdata[r][i];
					index += 1;
				}
			}
		}
		for (let i = 0; i < maxEcCount; i += 1) {
			for (let r = 0; r < rsBlocks.length; r += 1) {
				if (i < ecdata[r].length) {
					data[index] = ecdata[r][i];
					index += 1;
				}
			}
		}
		return data;
	};
	let createBuffer = (typeNumber, errorCorrectionLevel, dataList) => {
		let rsBlocks = getRSBlocks(typeNumber, errorCorrectionLevel);
		let buffer = QRBitBuffer();
		for (let i = 0; i < dataList.length; i += 1) {
			let data = dataList[i];
			buffer.put(data.getMode(), 4);
			buffer.put(data.getLength(), getLengthInBits(data.getMode(), typeNumber));
			data.write(buffer);
		}
		// calc num max data.
		let totalDataCount = 0;
		for (let i = 0; i < rsBlocks.length; i += 1) {
			totalDataCount += rsBlocks[i].dataCount;
		}
		return {
			buffer,
			rsBlocks,
			totalDataCount
		};
	};
	let createData = (typeNumber, errorCorrectionLevel, dataList) => {
		const { buffer, totalDataCount, rsBlocks } = createBuffer(typeNumber, errorCorrectionLevel, dataList); 
		if (buffer.getLengthInBits() > totalDataCount * 8) {
			throw 'code length overflow. (' + buffer.getLengthInBits() + '>' + totalDataCount * 8 + ')';
		}
		// end code
		if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
			buffer.put(0, 4);
		}
		// padding
		while (buffer.getLengthInBits() % 8 != 0) {
			buffer.putBit(false);
		}
		// padding
		while (true) {
			if (buffer.getLengthInBits() >= totalDataCount * 8) {
				break;
			}
			buffer.put(PAD0, 8);
			if (buffer.getLengthInBits() >= totalDataCount * 8) {
				break;
			}
			buffer.put(PAD1, 8);
		}
		return createBytes(buffer, rsBlocks);
	};
	const fitTypeNumber = (typeNumber, errorCorrectionLevel, dataList) => {
		const { buffer, totalDataCount, rsBlocks } = createBuffer(typeNumber, errorCorrectionLevel, dataList); 

		if (buffer.getLengthInBits() > totalDataCount * 8) {
			typeNumber = fitTypeNumber(typeNumber + 1, errorCorrectionLevel, dataList);
		}
		return typeNumber;
	};
	const makeImpl = (test, maskPattern) => {
		_typeNumber = fitTypeNumber(_typeNumber, _errorCorrectionLevel, _dataList);

		_moduleCount = _typeNumber * 4 + 17;
		_modules =  ((moduleCount) => {
			let modules = new Array(moduleCount);
			for (let row = 0; row < moduleCount; row += 1) {
				modules[row] = new Array(moduleCount);
				for (let col = 0; col < moduleCount; col += 1) {
					modules[row][col] = null;
				}
			}
			return modules;
		})(_moduleCount);
		setupPositionProbePattern(0, 0);
		setupPositionProbePattern(_moduleCount - 7, 0);
		setupPositionProbePattern(0, _moduleCount - 7);
		setupPositionAdjustPattern();
		setupTimingPattern();
		setupTypeInfo(test, maskPattern);
		if (_typeNumber >= 7) {
			setupTypeNumber(test);
		}
		if (_dataCache == null) {
			_dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
		}
		mapData(_dataCache, maskPattern);
	};
	_this = {
		addData(data, mode) {
			mode = mode || 'Byte';
			let newData = null;
			switch (mode) {
				case 'Numeric':
					newData = QRNumber(data);
					break;
				case 'Alphanumeric':
					newData = QRAlphaNum(data);
					break;
				case 'Byte':
					newData = QR8BitByte(data);
					break;
				case 'Kanji':
					newData = QRKanji(data);
					break;
				default:
					throw 'mode:' + mode;
			}
			_dataList.push(newData);
			_dataCache = null;
		},
		isDark(row, col) {
			if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
				throw row + ',' + col;
			}
			return _modules[row][col];
		},
		getModuleCount() {
			return _moduleCount;
		},
		make() {
			makeImpl(false, getBestMaskPattern());
		},
		createTableTag(cellSize, margin) {
			cellSize = cellSize || 2;
			margin = (typeof margin == 'undefined') ? cellSize * 4 : margin;
			let qrHtml = '';
			qrHtml += '<table style="';
			qrHtml += ' border-width: 0px; border-style: none;';
			qrHtml += ' border-collapse: collapse;';
			qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
			qrHtml += '">';
			qrHtml += '<tbody>';
			for (let r = 0; r < _this.getModuleCount(); r += 1) {
				qrHtml += '<tr>';
				for (let c = 0; c < _this.getModuleCount(); c += 1) {
					qrHtml += '<td style="';
					qrHtml += ' border-width: 0px; border-style: none;';
					qrHtml += ' border-collapse: collapse;';
					qrHtml += ' padding: 0px; margin: 0px;';
					qrHtml += ' width: ' + cellSize + 'px;';
					qrHtml += ' height: ' + cellSize + 'px;';
					qrHtml += ' background-color: ';
					qrHtml += _this.isDark(r, c) ? '#000000' : '#ffffff';
					qrHtml += ';';
					qrHtml += '"/>';
				}
				qrHtml += '</tr>';
			}
			qrHtml += '</tbody>';
			qrHtml += '</table>';
			return qrHtml;
		},
		createSvgTag(cellSize, margin) {
			cellSize = cellSize || 2;
			margin = (typeof margin == 'undefined') ? cellSize * 4 : margin;
			let size = _this.getModuleCount() * cellSize + margin * 2;
			let c, mc, r, mr, qrSvg = '',
				rect;
			rect = 'l' + cellSize + ',0 0,' + cellSize + ' -' + cellSize + ',0 0,-' + cellSize + 'z ';
			qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
			qrSvg += ' width="' + size + 'px"';
			qrSvg += ' height="' + size + 'px"';
			qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
			qrSvg += ' preserveAspectRatio="xMinYMin meet">';
			qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
			qrSvg += '<path d="';
			for (r = 0; r < _this.getModuleCount(); r += 1) {
				mr = r * cellSize + margin;
				for (c = 0; c < _this.getModuleCount(); c += 1) {
					if (_this.isDark(r, c)) {
						mc = c * cellSize + margin;
						qrSvg += 'M' + mc + ',' + mr + rect;
					}
				}
			}
			qrSvg += '" stroke="transparent" fill="black"/>';
			qrSvg += '</svg>';
			return qrSvg;
		},
		createBase64(cellSize, margin, mime) { 
			return _this.createImgTag(cellSize, margin, true, mime);
		},
		createImgTag(cellSize, margin, isBase64, mime) {
			cellSize = cellSize || 2;
			margin = (typeof margin == 'undefined') ? cellSize * 4 : margin;
			let size = _this.getModuleCount() * cellSize + margin * 2;
			let min = margin;
			let max = size - margin;
			return createImgTag(size, size, {
				getPixel: (x, y) => {
					if (min <= x && x < max && min <= y && y < max) {
						let c = Math.floor((x - min) / cellSize);
						let r = Math.floor((y - min) / cellSize);
						return _this.isDark(r, c) ? 0 : 1;
					}
					else {
						return 1;
					}
				},
				isBase64,
				mime
			});
		}
	};	
	return _this;
};

export default qrcode;

