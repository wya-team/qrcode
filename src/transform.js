import { QRMode } from './constants';
import { stringToBytesFuncs, stringToBytes } from './output';

// ---------------------------------------------------------------------
// QRBitBuffer
// ---------------------------------------------------------------------
export const QRBitBuffer = () => {
	let _buffer = [];
	let _length = 0;
	return {
		getBuffer() {
			return _buffer;
		},
		getAt(index) {
			let bufIndex = Math.floor(index / 8);
			return ((_buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1;
		},
		put(num, length) {
			for (let i = 0; i < length; i += 1) {
				this.putBit(((num >>> (length - i - 1)) & 1) == 1);
			}
		},
		getLengthInBits() {
			return _length;
		},
		putBit(bit) {
			let bufIndex = Math.floor(_length / 8);
			if (_buffer.length <= bufIndex) {
				_buffer.push(0);
			}
			if (bit) {
				_buffer[bufIndex] |= (0x80 >>> (_length % 8));
			}
			_length += 1;
		}
	};
};
// ---------------------------------------------------------------------
// QRNumber
// ---------------------------------------------------------------------
const strToNum = (s) => {
	let num = 0;
	for (let i = 0; i < s.length; i += 1) {
		num = num * 10 + chatToNum(s.charAt(i));
	}
	return num;
};
const chatToNum = (c) => {
	if ('0' <= c && c <= '9') {
		return c.charCodeAt(0) - '0'.charCodeAt(0);
	}
	throw 'illegal char :' + c;
};
export const QRNumber = (data) => {
	let _mode = QRMode.MODE_NUMBER;
	let _data = data;
	return {
		getMode() {
			return _mode;
		},
		getLength(buffer) {
			return _data.length;
		},
		write(buffer) {
			let data = _data;
			let i = 0;
			while (i + 2 < data.length) {
				buffer.put(strToNum(data.substring(i, i + 3)), 10);
				i += 3;
			}
			if (i < data.length) {
				if (data.length - i == 1) {
					buffer.put(strToNum(data.substring(i, i + 1)), 4);
				}
				else if (data.length - i == 2) {
					buffer.put(strToNum(data.substring(i, i + 2)), 7);
				}
			}
		}
	};
};
// ---------------------------------------------------------------------
// QRAlphaNum
// ---------------------------------------------------------------------
const getCode = (c) => {
	if ('0' <= c && c <= '9') {
		return c.charCodeAt(0) - '0'.charCodeAt(0);
	}
	else if ('A' <= c && c <= 'Z') {
		return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
	}
	else {
		switch (c) {
			case ' ':
				return 36;
			case '$':
				return 37;
			case '%':
				return 38;
			case '*':
				return 39;
			case '+':
				return 40;
			case '-':
				return 41;
			case '.':
				return 42;
			case '/':
				return 43;
			case ':':
				return 44;
			default:
				throw 'illegal char :' + c;
		}
	}
};
export const QRAlphaNum = (data) => {
	let _mode = QRMode.MODE_ALPHA_NUM;
	let _data = data;
	return {
		getMode() {
			return _mode;
		},
		getLength(buffer) {
			return _data.length;
		},
		write(buffer) {
			let s = _data;
			let i = 0;
			while (i + 1 < s.length) {
				buffer.put(getCode(s.charAt(i)) * 45 + getCode(s.charAt(i + 1)), 11);
				i += 2;
			}
			if (i < s.length) {
				buffer.put(getCode(s.charAt(i)), 6);
			}
		}
	};
};


// ---------------------------------------------------------------------
// QR8BitByte
// ---------------------------------------------------------------------
export const QR8BitByte = function (data) {
	let _mode = QRMode.MODE_8BIT_BYTE;
	let _data = data;
	let _bytes = stringToBytes(data);
	return {
		getMode () { return _mode; },
		getLength (buffer) { return _bytes.length; },
		write (buffer) {
			for (let i = 0; i < _bytes.length; i += 1) {
				buffer.put(_bytes[i], 8);
			}
		},
	};
};

 
// ---------------------------------------------------------------------
// QRKanji
// ---------------------------------------------------------------------
export const QRKanji = (data) => {
	let _mode = QRMode.MODE_KANJI;
	let _data = data;
	let _stringToBytes = stringToBytesFuncs['SJIS'];
	if (!_stringToBytes) {
		throw 'sjis not supported.';
	}

	// self test for sjis support.
	let test = _stringToBytes('\u53cb');
	if (test.length != 2 || ((test[0] << 8) | test[1]) != 0x9746) {
		throw 'sjis not supported.';
	}
	
	let _bytes = _stringToBytes(data);

	return {
		getMode () { return _mode; },
		getLength (buffer){ return ~~(_bytes.length / 2); },
		write (buffer) {
			let data = _bytes;
			let i = 0;
			while (i + 1 < data.length) {
				let c = ((0xff & data[i]) << 8) | (0xff & data[i + 1]);
				if (0x8140 <= c && c <= 0x9FFC) {
					c -= 0x8140;
				}
				else if (0xE040 <= c && c <= 0xEBBF) {
					c -= 0xC140;
				}
				else {
					throw 'illegal char at ' + (i + 1) + '/' + c;
				}
				c = ((c >>> 8) & 0xff) * 0xC0 + (c & 0xff);
				buffer.put(c, 13);
				i += 2;
			}
			if (i < data.length) {
				throw 'illegal char at ' + (i + 1);
			}
		}
	};
};

