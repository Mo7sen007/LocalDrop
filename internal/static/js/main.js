var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/lib/services/qrcode.vendor.js
var require_qrcode_vendor = __commonJS({
  "src/lib/services/qrcode.vendor.js"(exports, module) {
    "use strict";
    var qrcode2 = (function() {
      var qrcode3 = function(typeNumber, errorCorrectionLevel) {
        var PAD0 = 236;
        var PAD1 = 17;
        var _typeNumber = typeNumber;
        var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
        var _modules = null;
        var _moduleCount = 0;
        var _dataCache = null;
        var _dataList = [];
        var _this = {};
        var makeImpl = function(test, maskPattern) {
          _moduleCount = _typeNumber * 4 + 17;
          _modules = (function(moduleCount) {
            var modules2 = new Array(moduleCount);
            for (var row = 0; row < moduleCount; row += 1) {
              modules2[row] = new Array(moduleCount);
              for (var col = 0; col < moduleCount; col += 1) {
                modules2[row][col] = null;
              }
            }
            return modules2;
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
        var setupPositionProbePattern = function(row, col) {
          for (var r = -1; r <= 7; r += 1) {
            if (row + r <= -1 || _moduleCount <= row + r) continue;
            for (var c = -1; c <= 7; c += 1) {
              if (col + c <= -1 || _moduleCount <= col + c) continue;
              if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        };
        var getBestMaskPattern = function() {
          var minLostPoint = 0;
          var pattern = 0;
          for (var i = 0; i < 8; i += 1) {
            makeImpl(true, i);
            var lostPoint = QRUtil.getLostPoint(_this);
            if (i == 0 || minLostPoint > lostPoint) {
              minLostPoint = lostPoint;
              pattern = i;
            }
          }
          return pattern;
        };
        var setupTimingPattern = function() {
          for (var r = 8; r < _moduleCount - 8; r += 1) {
            if (_modules[r][6] != null) {
              continue;
            }
            _modules[r][6] = r % 2 == 0;
          }
          for (var c = 8; c < _moduleCount - 8; c += 1) {
            if (_modules[6][c] != null) {
              continue;
            }
            _modules[6][c] = c % 2 == 0;
          }
        };
        var setupPositionAdjustPattern = function() {
          var pos = QRUtil.getPatternPosition(_typeNumber);
          for (var i = 0; i < pos.length; i += 1) {
            for (var j = 0; j < pos.length; j += 1) {
              var row = pos[i];
              var col = pos[j];
              if (_modules[row][col] != null) {
                continue;
              }
              for (var r = -2; r <= 2; r += 1) {
                for (var c = -2; c <= 2; c += 1) {
                  if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
                    _modules[row + r][col + c] = true;
                  } else {
                    _modules[row + r][col + c] = false;
                  }
                }
              }
            }
          }
        };
        var setupTypeNumber = function(test) {
          var bits = QRUtil.getBCHTypeNumber(_typeNumber);
          for (var i = 0; i < 18; i += 1) {
            var mod = !test && (bits >> i & 1) == 1;
            _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
          }
          for (var i = 0; i < 18; i += 1) {
            var mod = !test && (bits >> i & 1) == 1;
            _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
          }
        };
        var setupTypeInfo = function(test, maskPattern) {
          var data = _errorCorrectionLevel << 3 | maskPattern;
          var bits = QRUtil.getBCHTypeInfo(data);
          for (var i = 0; i < 15; i += 1) {
            var mod = !test && (bits >> i & 1) == 1;
            if (i < 6) {
              _modules[i][8] = mod;
            } else if (i < 8) {
              _modules[i + 1][8] = mod;
            } else {
              _modules[_moduleCount - 15 + i][8] = mod;
            }
          }
          for (var i = 0; i < 15; i += 1) {
            var mod = !test && (bits >> i & 1) == 1;
            if (i < 8) {
              _modules[8][_moduleCount - i - 1] = mod;
            } else if (i < 9) {
              _modules[8][15 - i - 1 + 1] = mod;
            } else {
              _modules[8][15 - i - 1] = mod;
            }
          }
          _modules[_moduleCount - 8][8] = !test;
        };
        var mapData = function(data, maskPattern) {
          var inc = -1;
          var row = _moduleCount - 1;
          var bitIndex = 7;
          var byteIndex = 0;
          var maskFunc = QRUtil.getMaskFunction(maskPattern);
          for (var col = _moduleCount - 1; col > 0; col -= 2) {
            if (col == 6) col -= 1;
            while (true) {
              for (var c = 0; c < 2; c += 1) {
                if (_modules[row][col - c] == null) {
                  var dark = false;
                  if (byteIndex < data.length) {
                    dark = (data[byteIndex] >>> bitIndex & 1) == 1;
                  }
                  var mask = maskFunc(row, col - c);
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
        var createBytes = function(buffer, rsBlocks) {
          var offset = 0;
          var maxDcCount = 0;
          var maxEcCount = 0;
          var dcdata = new Array(rsBlocks.length);
          var ecdata = new Array(rsBlocks.length);
          for (var r = 0; r < rsBlocks.length; r += 1) {
            var dcCount = rsBlocks[r].dataCount;
            var ecCount = rsBlocks[r].totalCount - dcCount;
            maxDcCount = Math.max(maxDcCount, dcCount);
            maxEcCount = Math.max(maxEcCount, ecCount);
            dcdata[r] = new Array(dcCount);
            for (var i = 0; i < dcdata[r].length; i += 1) {
              dcdata[r][i] = 255 & buffer.getBuffer()[i + offset];
            }
            offset += dcCount;
            var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
            var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);
            var modPoly = rawPoly.mod(rsPoly);
            ecdata[r] = new Array(rsPoly.getLength() - 1);
            for (var i = 0; i < ecdata[r].length; i += 1) {
              var modIndex = i + modPoly.getLength() - ecdata[r].length;
              ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
            }
          }
          var totalCodeCount = 0;
          for (var i = 0; i < rsBlocks.length; i += 1) {
            totalCodeCount += rsBlocks[i].totalCount;
          }
          var data = new Array(totalCodeCount);
          var index = 0;
          for (var i = 0; i < maxDcCount; i += 1) {
            for (var r = 0; r < rsBlocks.length; r += 1) {
              if (i < dcdata[r].length) {
                data[index] = dcdata[r][i];
                index += 1;
              }
            }
          }
          for (var i = 0; i < maxEcCount; i += 1) {
            for (var r = 0; r < rsBlocks.length; r += 1) {
              if (i < ecdata[r].length) {
                data[index] = ecdata[r][i];
                index += 1;
              }
            }
          }
          return data;
        };
        var createData = function(typeNumber2, errorCorrectionLevel2, dataList) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, errorCorrectionLevel2);
          var buffer = qrBitBuffer();
          for (var i = 0; i < dataList.length; i += 1) {
            var data = dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
            data.write(buffer);
          }
          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i += 1) {
            totalDataCount += rsBlocks[i].dataCount;
          }
          if (buffer.getLengthInBits() > totalDataCount * 8) {
            throw "code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")";
          }
          if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
            buffer.put(0, 4);
          }
          while (buffer.getLengthInBits() % 8 != 0) {
            buffer.putBit(false);
          }
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
        _this.addData = function(data, mode) {
          mode = mode || "Byte";
          var newData = null;
          switch (mode) {
            case "Numeric":
              newData = qrNumber(data);
              break;
            case "Alphanumeric":
              newData = qrAlphaNum(data);
              break;
            case "Byte":
              newData = qr8BitByte(data);
              break;
            case "Kanji":
              newData = qrKanji(data);
              break;
            default:
              throw "mode:" + mode;
          }
          _dataList.push(newData);
          _dataCache = null;
        };
        _this.isDark = function(row, col) {
          if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
            throw row + "," + col;
          }
          return _modules[row][col];
        };
        _this.getModuleCount = function() {
          return _moduleCount;
        };
        _this.make = function() {
          if (_typeNumber < 1) {
            var typeNumber2 = 1;
            for (; typeNumber2 < 40; typeNumber2++) {
              var rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, _errorCorrectionLevel);
              var buffer = qrBitBuffer();
              for (var i = 0; i < _dataList.length; i++) {
                var data = _dataList[i];
                buffer.put(data.getMode(), 4);
                buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
                data.write(buffer);
              }
              var totalDataCount = 0;
              for (var i = 0; i < rsBlocks.length; i++) {
                totalDataCount += rsBlocks[i].dataCount;
              }
              if (buffer.getLengthInBits() <= totalDataCount * 8) {
                break;
              }
            }
            _typeNumber = typeNumber2;
          }
          makeImpl(false, getBestMaskPattern());
        };
        _this.createTableTag = function(cellSize, margin) {
          cellSize = cellSize || 2;
          margin = typeof margin == "undefined" ? cellSize * 4 : margin;
          var qrHtml = "";
          qrHtml += '<table style="';
          qrHtml += " border-width: 0px; border-style: none;";
          qrHtml += " border-collapse: collapse;";
          qrHtml += " padding: 0px; margin: " + margin + "px;";
          qrHtml += '">';
          qrHtml += "<tbody>";
          for (var r = 0; r < _this.getModuleCount(); r += 1) {
            qrHtml += "<tr>";
            for (var c = 0; c < _this.getModuleCount(); c += 1) {
              qrHtml += '<td style="';
              qrHtml += " border-width: 0px; border-style: none;";
              qrHtml += " border-collapse: collapse;";
              qrHtml += " padding: 0px; margin: 0px;";
              qrHtml += " width: " + cellSize + "px;";
              qrHtml += " height: " + cellSize + "px;";
              qrHtml += " background-color: ";
              qrHtml += _this.isDark(r, c) ? "#000000" : "#ffffff";
              qrHtml += ";";
              qrHtml += '"/>';
            }
            qrHtml += "</tr>";
          }
          qrHtml += "</tbody>";
          qrHtml += "</table>";
          return qrHtml;
        };
        _this.createSvgTag = function(cellSize, margin, alt, title) {
          var opts = {};
          if (typeof arguments[0] == "object") {
            opts = arguments[0];
            cellSize = opts.cellSize;
            margin = opts.margin;
            alt = opts.alt;
            title = opts.title;
          }
          cellSize = cellSize || 2;
          margin = typeof margin == "undefined" ? cellSize * 4 : margin;
          alt = typeof alt === "string" ? { text: alt } : alt || {};
          alt.text = alt.text || null;
          alt.id = alt.text ? alt.id || "qrcode-description" : null;
          title = typeof title === "string" ? { text: title } : title || {};
          title.text = title.text || null;
          title.id = title.text ? title.id || "qrcode-title" : null;
          var size = _this.getModuleCount() * cellSize + margin * 2;
          var c, mc, r, mr, qrSvg = "", rect;
          rect = "l" + cellSize + ",0 0," + cellSize + " -" + cellSize + ",0 0,-" + cellSize + "z ";
          qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
          qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : "";
          qrSvg += ' viewBox="0 0 ' + size + " " + size + '" ';
          qrSvg += ' preserveAspectRatio="xMinYMin meet"';
          qrSvg += title.text || alt.text ? ' role="img" aria-labelledby="' + escapeXml([title.id, alt.id].join(" ").trim()) + '"' : "";
          qrSvg += ">";
          qrSvg += title.text ? '<title id="' + escapeXml(title.id) + '">' + escapeXml(title.text) + "</title>" : "";
          qrSvg += alt.text ? '<description id="' + escapeXml(alt.id) + '">' + escapeXml(alt.text) + "</description>" : "";
          qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
          qrSvg += '<path d="';
          for (r = 0; r < _this.getModuleCount(); r += 1) {
            mr = r * cellSize + margin;
            for (c = 0; c < _this.getModuleCount(); c += 1) {
              if (_this.isDark(r, c)) {
                mc = c * cellSize + margin;
                qrSvg += "M" + mc + "," + mr + rect;
              }
            }
          }
          qrSvg += '" stroke="transparent" fill="black"/>';
          qrSvg += "</svg>";
          return qrSvg;
        };
        _this.createDataURL = function(cellSize, margin) {
          cellSize = cellSize || 2;
          margin = typeof margin == "undefined" ? cellSize * 4 : margin;
          var size = _this.getModuleCount() * cellSize + margin * 2;
          var min = margin;
          var max = size - margin;
          return createDataURL(size, size, function(x, y) {
            if (min <= x && x < max && min <= y && y < max) {
              var c = Math.floor((x - min) / cellSize);
              var r = Math.floor((y - min) / cellSize);
              return _this.isDark(r, c) ? 0 : 1;
            } else {
              return 1;
            }
          });
        };
        _this.createImgTag = function(cellSize, margin, alt) {
          cellSize = cellSize || 2;
          margin = typeof margin == "undefined" ? cellSize * 4 : margin;
          var size = _this.getModuleCount() * cellSize + margin * 2;
          var img = "";
          img += "<img";
          img += ' src="';
          img += _this.createDataURL(cellSize, margin);
          img += '"';
          img += ' width="';
          img += size;
          img += '"';
          img += ' height="';
          img += size;
          img += '"';
          if (alt) {
            img += ' alt="';
            img += escapeXml(alt);
            img += '"';
          }
          img += "/>";
          return img;
        };
        var escapeXml = function(s) {
          var escaped = "";
          for (var i = 0; i < s.length; i += 1) {
            var c = s.charAt(i);
            switch (c) {
              case "<":
                escaped += "&lt;";
                break;
              case ">":
                escaped += "&gt;";
                break;
              case "&":
                escaped += "&amp;";
                break;
              case '"':
                escaped += "&quot;";
                break;
              default:
                escaped += c;
                break;
            }
          }
          return escaped;
        };
        var _createHalfASCII = function(margin) {
          var cellSize = 1;
          margin = typeof margin == "undefined" ? cellSize * 2 : margin;
          var size = _this.getModuleCount() * cellSize + margin * 2;
          var min = margin;
          var max = size - margin;
          var y, x, r1, r2, p;
          var blocks = {
            "██": "█",
            "█ ": "▀",
            " █": "▄",
            "  ": " "
          };
          var blocksLastLineNoMargin = {
            "██": "▀",
            "█ ": "▀",
            " █": " ",
            "  ": " "
          };
          var ascii = "";
          for (y = 0; y < size; y += 2) {
            r1 = Math.floor((y - min) / cellSize);
            r2 = Math.floor((y + 1 - min) / cellSize);
            for (x = 0; x < size; x += 1) {
              p = "█";
              if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
                p = " ";
              }
              if (min <= x && x < max && min <= y + 1 && y + 1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
                p += " ";
              } else {
                p += "█";
              }
              ascii += margin < 1 && y + 1 >= max ? blocksLastLineNoMargin[p] : blocks[p];
            }
            ascii += "\n";
          }
          if (size % 2 && margin > 0) {
            return ascii.substring(0, ascii.length - size - 1) + Array(size + 1).join("▀");
          }
          return ascii.substring(0, ascii.length - 1);
        };
        _this.createASCII = function(cellSize, margin) {
          cellSize = cellSize || 1;
          if (cellSize < 2) {
            return _createHalfASCII(margin);
          }
          cellSize -= 1;
          margin = typeof margin == "undefined" ? cellSize * 2 : margin;
          var size = _this.getModuleCount() * cellSize + margin * 2;
          var min = margin;
          var max = size - margin;
          var y, x, r, p;
          var white = Array(cellSize + 1).join("██");
          var black = Array(cellSize + 1).join("  ");
          var ascii = "";
          var line = "";
          for (y = 0; y < size; y += 1) {
            r = Math.floor((y - min) / cellSize);
            line = "";
            for (x = 0; x < size; x += 1) {
              p = 1;
              if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
                p = 0;
              }
              line += p ? white : black;
            }
            for (r = 0; r < cellSize; r += 1) {
              ascii += line + "\n";
            }
          }
          return ascii.substring(0, ascii.length - 1);
        };
        _this.renderTo2dContext = function(context, cellSize) {
          cellSize = cellSize || 2;
          var length = _this.getModuleCount();
          for (var row = 0; row < length; row++) {
            for (var col = 0; col < length; col++) {
              context.fillStyle = _this.isDark(row, col) ? "black" : "white";
              context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
            }
          }
        };
        return _this;
      };
      qrcode3.stringToBytesFuncs = {
        "default": function(s) {
          var bytes = [];
          for (var i = 0; i < s.length; i += 1) {
            var c = s.charCodeAt(i);
            bytes.push(c & 255);
          }
          return bytes;
        }
      };
      qrcode3.stringToBytes = qrcode3.stringToBytesFuncs["default"];
      qrcode3.createStringToBytes = function(unicodeData, numChars) {
        var unicodeMap = (function() {
          var bin = base64DecodeInputStream(unicodeData);
          var read = function() {
            var b = bin.read();
            if (b == -1) throw "eof";
            return b;
          };
          var count = 0;
          var unicodeMap2 = {};
          while (true) {
            var b0 = bin.read();
            if (b0 == -1) break;
            var b1 = read();
            var b2 = read();
            var b3 = read();
            var k = String.fromCharCode(b0 << 8 | b1);
            var v = b2 << 8 | b3;
            unicodeMap2[k] = v;
            count += 1;
          }
          if (count != numChars) {
            throw count + " != " + numChars;
          }
          return unicodeMap2;
        })();
        var unknownChar = "?".charCodeAt(0);
        return function(s) {
          var bytes = [];
          for (var i = 0; i < s.length; i += 1) {
            var c = s.charCodeAt(i);
            if (c < 128) {
              bytes.push(c);
            } else {
              var b = unicodeMap[s.charAt(i)];
              if (typeof b == "number") {
                if ((b & 255) == b) {
                  bytes.push(b);
                } else {
                  bytes.push(b >>> 8);
                  bytes.push(b & 255);
                }
              } else {
                bytes.push(unknownChar);
              }
            }
          }
          return bytes;
        };
      };
      var QRMode = {
        MODE_NUMBER: 1 << 0,
        MODE_ALPHA_NUM: 1 << 1,
        MODE_8BIT_BYTE: 1 << 2,
        MODE_KANJI: 1 << 3
      };
      var QRErrorCorrectionLevel = {
        L: 1,
        M: 0,
        Q: 3,
        H: 2
      };
      var QRMaskPattern = {
        PATTERN000: 0,
        PATTERN001: 1,
        PATTERN010: 2,
        PATTERN011: 3,
        PATTERN100: 4,
        PATTERN101: 5,
        PATTERN110: 6,
        PATTERN111: 7
      };
      var QRUtil = (function() {
        var PATTERN_POSITION_TABLE = [
          [],
          [6, 18],
          [6, 22],
          [6, 26],
          [6, 30],
          [6, 34],
          [6, 22, 38],
          [6, 24, 42],
          [6, 26, 46],
          [6, 28, 50],
          [6, 30, 54],
          [6, 32, 58],
          [6, 34, 62],
          [6, 26, 46, 66],
          [6, 26, 48, 70],
          [6, 26, 50, 74],
          [6, 30, 54, 78],
          [6, 30, 56, 82],
          [6, 30, 58, 86],
          [6, 34, 62, 90],
          [6, 28, 50, 72, 94],
          [6, 26, 50, 74, 98],
          [6, 30, 54, 78, 102],
          [6, 28, 54, 80, 106],
          [6, 32, 58, 84, 110],
          [6, 30, 58, 86, 114],
          [6, 34, 62, 90, 118],
          [6, 26, 50, 74, 98, 122],
          [6, 30, 54, 78, 102, 126],
          [6, 26, 52, 78, 104, 130],
          [6, 30, 56, 82, 108, 134],
          [6, 34, 60, 86, 112, 138],
          [6, 30, 58, 86, 114, 142],
          [6, 34, 62, 90, 118, 146],
          [6, 30, 54, 78, 102, 126, 150],
          [6, 24, 50, 76, 102, 128, 154],
          [6, 28, 54, 80, 106, 132, 158],
          [6, 32, 58, 84, 110, 136, 162],
          [6, 26, 54, 82, 110, 138, 166],
          [6, 30, 58, 86, 114, 142, 170]
        ];
        var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
        var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
        var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
        var _this = {};
        var getBCHDigit = function(data) {
          var digit = 0;
          while (data != 0) {
            digit += 1;
            data >>>= 1;
          }
          return digit;
        };
        _this.getBCHTypeInfo = function(data) {
          var d = data << 10;
          while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
            d ^= G15 << getBCHDigit(d) - getBCHDigit(G15);
          }
          return (data << 10 | d) ^ G15_MASK;
        };
        _this.getBCHTypeNumber = function(data) {
          var d = data << 12;
          while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
            d ^= G18 << getBCHDigit(d) - getBCHDigit(G18);
          }
          return data << 12 | d;
        };
        _this.getPatternPosition = function(typeNumber) {
          return PATTERN_POSITION_TABLE[typeNumber - 1];
        };
        _this.getMaskFunction = function(maskPattern) {
          switch (maskPattern) {
            case QRMaskPattern.PATTERN000:
              return function(i, j) {
                return (i + j) % 2 == 0;
              };
            case QRMaskPattern.PATTERN001:
              return function(i, j) {
                return i % 2 == 0;
              };
            case QRMaskPattern.PATTERN010:
              return function(i, j) {
                return j % 3 == 0;
              };
            case QRMaskPattern.PATTERN011:
              return function(i, j) {
                return (i + j) % 3 == 0;
              };
            case QRMaskPattern.PATTERN100:
              return function(i, j) {
                return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
              };
            case QRMaskPattern.PATTERN101:
              return function(i, j) {
                return i * j % 2 + i * j % 3 == 0;
              };
            case QRMaskPattern.PATTERN110:
              return function(i, j) {
                return (i * j % 2 + i * j % 3) % 2 == 0;
              };
            case QRMaskPattern.PATTERN111:
              return function(i, j) {
                return (i * j % 3 + (i + j) % 2) % 2 == 0;
              };
            default:
              throw "bad maskPattern:" + maskPattern;
          }
        };
        _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
          var a = qrPolynomial([1], 0);
          for (var i = 0; i < errorCorrectLength; i += 1) {
            a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
          }
          return a;
        };
        _this.getLengthInBits = function(mode, type) {
          if (1 <= type && type < 10) {
            switch (mode) {
              case QRMode.MODE_NUMBER:
                return 10;
              case QRMode.MODE_ALPHA_NUM:
                return 9;
              case QRMode.MODE_8BIT_BYTE:
                return 8;
              case QRMode.MODE_KANJI:
                return 8;
              default:
                throw "mode:" + mode;
            }
          } else if (type < 27) {
            switch (mode) {
              case QRMode.MODE_NUMBER:
                return 12;
              case QRMode.MODE_ALPHA_NUM:
                return 11;
              case QRMode.MODE_8BIT_BYTE:
                return 16;
              case QRMode.MODE_KANJI:
                return 10;
              default:
                throw "mode:" + mode;
            }
          } else if (type < 41) {
            switch (mode) {
              case QRMode.MODE_NUMBER:
                return 14;
              case QRMode.MODE_ALPHA_NUM:
                return 13;
              case QRMode.MODE_8BIT_BYTE:
                return 16;
              case QRMode.MODE_KANJI:
                return 12;
              default:
                throw "mode:" + mode;
            }
          } else {
            throw "type:" + type;
          }
        };
        _this.getLostPoint = function(qrcode4) {
          var moduleCount = qrcode4.getModuleCount();
          var lostPoint = 0;
          for (var row = 0; row < moduleCount; row += 1) {
            for (var col = 0; col < moduleCount; col += 1) {
              var sameCount = 0;
              var dark = qrcode4.isDark(row, col);
              for (var r = -1; r <= 1; r += 1) {
                if (row + r < 0 || moduleCount <= row + r) {
                  continue;
                }
                for (var c = -1; c <= 1; c += 1) {
                  if (col + c < 0 || moduleCount <= col + c) {
                    continue;
                  }
                  if (r == 0 && c == 0) {
                    continue;
                  }
                  if (dark == qrcode4.isDark(row + r, col + c)) {
                    sameCount += 1;
                  }
                }
              }
              if (sameCount > 5) {
                lostPoint += 3 + sameCount - 5;
              }
            }
          }
          ;
          for (var row = 0; row < moduleCount - 1; row += 1) {
            for (var col = 0; col < moduleCount - 1; col += 1) {
              var count = 0;
              if (qrcode4.isDark(row, col)) count += 1;
              if (qrcode4.isDark(row + 1, col)) count += 1;
              if (qrcode4.isDark(row, col + 1)) count += 1;
              if (qrcode4.isDark(row + 1, col + 1)) count += 1;
              if (count == 0 || count == 4) {
                lostPoint += 3;
              }
            }
          }
          for (var row = 0; row < moduleCount; row += 1) {
            for (var col = 0; col < moduleCount - 6; col += 1) {
              if (qrcode4.isDark(row, col) && !qrcode4.isDark(row, col + 1) && qrcode4.isDark(row, col + 2) && qrcode4.isDark(row, col + 3) && qrcode4.isDark(row, col + 4) && !qrcode4.isDark(row, col + 5) && qrcode4.isDark(row, col + 6)) {
                lostPoint += 40;
              }
            }
          }
          for (var col = 0; col < moduleCount; col += 1) {
            for (var row = 0; row < moduleCount - 6; row += 1) {
              if (qrcode4.isDark(row, col) && !qrcode4.isDark(row + 1, col) && qrcode4.isDark(row + 2, col) && qrcode4.isDark(row + 3, col) && qrcode4.isDark(row + 4, col) && !qrcode4.isDark(row + 5, col) && qrcode4.isDark(row + 6, col)) {
                lostPoint += 40;
              }
            }
          }
          var darkCount = 0;
          for (var col = 0; col < moduleCount; col += 1) {
            for (var row = 0; row < moduleCount; row += 1) {
              if (qrcode4.isDark(row, col)) {
                darkCount += 1;
              }
            }
          }
          var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
          lostPoint += ratio * 10;
          return lostPoint;
        };
        return _this;
      })();
      var QRMath = (function() {
        var EXP_TABLE = new Array(256);
        var LOG_TABLE = new Array(256);
        for (var i = 0; i < 8; i += 1) {
          EXP_TABLE[i] = 1 << i;
        }
        for (var i = 8; i < 256; i += 1) {
          EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
        }
        for (var i = 0; i < 255; i += 1) {
          LOG_TABLE[EXP_TABLE[i]] = i;
        }
        var _this = {};
        _this.glog = function(n) {
          if (n < 1) {
            throw "glog(" + n + ")";
          }
          return LOG_TABLE[n];
        };
        _this.gexp = function(n) {
          while (n < 0) {
            n += 255;
          }
          while (n >= 256) {
            n -= 255;
          }
          return EXP_TABLE[n];
        };
        return _this;
      })();
      function qrPolynomial(num, shift) {
        if (typeof num.length == "undefined") {
          throw num.length + "/" + shift;
        }
        var _num = (function() {
          var offset = 0;
          while (offset < num.length && num[offset] == 0) {
            offset += 1;
          }
          var _num2 = new Array(num.length - offset + shift);
          for (var i = 0; i < num.length - offset; i += 1) {
            _num2[i] = num[i + offset];
          }
          return _num2;
        })();
        var _this = {};
        _this.getAt = function(index) {
          return _num[index];
        };
        _this.getLength = function() {
          return _num.length;
        };
        _this.multiply = function(e) {
          var num2 = new Array(_this.getLength() + e.getLength() - 1);
          for (var i = 0; i < _this.getLength(); i += 1) {
            for (var j = 0; j < e.getLength(); j += 1) {
              num2[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i)) + QRMath.glog(e.getAt(j)));
            }
          }
          return qrPolynomial(num2, 0);
        };
        _this.mod = function(e) {
          if (_this.getLength() - e.getLength() < 0) {
            return _this;
          }
          var ratio = QRMath.glog(_this.getAt(0)) - QRMath.glog(e.getAt(0));
          var num2 = new Array(_this.getLength());
          for (var i = 0; i < _this.getLength(); i += 1) {
            num2[i] = _this.getAt(i);
          }
          for (var i = 0; i < e.getLength(); i += 1) {
            num2[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
          }
          return qrPolynomial(num2, 0).mod(e);
        };
        return _this;
      }
      ;
      var QRRSBlock = (function() {
        var RS_BLOCK_TABLE = [
          // L
          // M
          // Q
          // H
          // 1
          [1, 26, 19],
          [1, 26, 16],
          [1, 26, 13],
          [1, 26, 9],
          // 2
          [1, 44, 34],
          [1, 44, 28],
          [1, 44, 22],
          [1, 44, 16],
          // 3
          [1, 70, 55],
          [1, 70, 44],
          [2, 35, 17],
          [2, 35, 13],
          // 4
          [1, 100, 80],
          [2, 50, 32],
          [2, 50, 24],
          [4, 25, 9],
          // 5
          [1, 134, 108],
          [2, 67, 43],
          [2, 33, 15, 2, 34, 16],
          [2, 33, 11, 2, 34, 12],
          // 6
          [2, 86, 68],
          [4, 43, 27],
          [4, 43, 19],
          [4, 43, 15],
          // 7
          [2, 98, 78],
          [4, 49, 31],
          [2, 32, 14, 4, 33, 15],
          [4, 39, 13, 1, 40, 14],
          // 8
          [2, 121, 97],
          [2, 60, 38, 2, 61, 39],
          [4, 40, 18, 2, 41, 19],
          [4, 40, 14, 2, 41, 15],
          // 9
          [2, 146, 116],
          [3, 58, 36, 2, 59, 37],
          [4, 36, 16, 4, 37, 17],
          [4, 36, 12, 4, 37, 13],
          // 10
          [2, 86, 68, 2, 87, 69],
          [4, 69, 43, 1, 70, 44],
          [6, 43, 19, 2, 44, 20],
          [6, 43, 15, 2, 44, 16],
          // 11
          [4, 101, 81],
          [1, 80, 50, 4, 81, 51],
          [4, 50, 22, 4, 51, 23],
          [3, 36, 12, 8, 37, 13],
          // 12
          [2, 116, 92, 2, 117, 93],
          [6, 58, 36, 2, 59, 37],
          [4, 46, 20, 6, 47, 21],
          [7, 42, 14, 4, 43, 15],
          // 13
          [4, 133, 107],
          [8, 59, 37, 1, 60, 38],
          [8, 44, 20, 4, 45, 21],
          [12, 33, 11, 4, 34, 12],
          // 14
          [3, 145, 115, 1, 146, 116],
          [4, 64, 40, 5, 65, 41],
          [11, 36, 16, 5, 37, 17],
          [11, 36, 12, 5, 37, 13],
          // 15
          [5, 109, 87, 1, 110, 88],
          [5, 65, 41, 5, 66, 42],
          [5, 54, 24, 7, 55, 25],
          [11, 36, 12, 7, 37, 13],
          // 16
          [5, 122, 98, 1, 123, 99],
          [7, 73, 45, 3, 74, 46],
          [15, 43, 19, 2, 44, 20],
          [3, 45, 15, 13, 46, 16],
          // 17
          [1, 135, 107, 5, 136, 108],
          [10, 74, 46, 1, 75, 47],
          [1, 50, 22, 15, 51, 23],
          [2, 42, 14, 17, 43, 15],
          // 18
          [5, 150, 120, 1, 151, 121],
          [9, 69, 43, 4, 70, 44],
          [17, 50, 22, 1, 51, 23],
          [2, 42, 14, 19, 43, 15],
          // 19
          [3, 141, 113, 4, 142, 114],
          [3, 70, 44, 11, 71, 45],
          [17, 47, 21, 4, 48, 22],
          [9, 39, 13, 16, 40, 14],
          // 20
          [3, 135, 107, 5, 136, 108],
          [3, 67, 41, 13, 68, 42],
          [15, 54, 24, 5, 55, 25],
          [15, 43, 15, 10, 44, 16],
          // 21
          [4, 144, 116, 4, 145, 117],
          [17, 68, 42],
          [17, 50, 22, 6, 51, 23],
          [19, 46, 16, 6, 47, 17],
          // 22
          [2, 139, 111, 7, 140, 112],
          [17, 74, 46],
          [7, 54, 24, 16, 55, 25],
          [34, 37, 13],
          // 23
          [4, 151, 121, 5, 152, 122],
          [4, 75, 47, 14, 76, 48],
          [11, 54, 24, 14, 55, 25],
          [16, 45, 15, 14, 46, 16],
          // 24
          [6, 147, 117, 4, 148, 118],
          [6, 73, 45, 14, 74, 46],
          [11, 54, 24, 16, 55, 25],
          [30, 46, 16, 2, 47, 17],
          // 25
          [8, 132, 106, 4, 133, 107],
          [8, 75, 47, 13, 76, 48],
          [7, 54, 24, 22, 55, 25],
          [22, 45, 15, 13, 46, 16],
          // 26
          [10, 142, 114, 2, 143, 115],
          [19, 74, 46, 4, 75, 47],
          [28, 50, 22, 6, 51, 23],
          [33, 46, 16, 4, 47, 17],
          // 27
          [8, 152, 122, 4, 153, 123],
          [22, 73, 45, 3, 74, 46],
          [8, 53, 23, 26, 54, 24],
          [12, 45, 15, 28, 46, 16],
          // 28
          [3, 147, 117, 10, 148, 118],
          [3, 73, 45, 23, 74, 46],
          [4, 54, 24, 31, 55, 25],
          [11, 45, 15, 31, 46, 16],
          // 29
          [7, 146, 116, 7, 147, 117],
          [21, 73, 45, 7, 74, 46],
          [1, 53, 23, 37, 54, 24],
          [19, 45, 15, 26, 46, 16],
          // 30
          [5, 145, 115, 10, 146, 116],
          [19, 75, 47, 10, 76, 48],
          [15, 54, 24, 25, 55, 25],
          [23, 45, 15, 25, 46, 16],
          // 31
          [13, 145, 115, 3, 146, 116],
          [2, 74, 46, 29, 75, 47],
          [42, 54, 24, 1, 55, 25],
          [23, 45, 15, 28, 46, 16],
          // 32
          [17, 145, 115],
          [10, 74, 46, 23, 75, 47],
          [10, 54, 24, 35, 55, 25],
          [19, 45, 15, 35, 46, 16],
          // 33
          [17, 145, 115, 1, 146, 116],
          [14, 74, 46, 21, 75, 47],
          [29, 54, 24, 19, 55, 25],
          [11, 45, 15, 46, 46, 16],
          // 34
          [13, 145, 115, 6, 146, 116],
          [14, 74, 46, 23, 75, 47],
          [44, 54, 24, 7, 55, 25],
          [59, 46, 16, 1, 47, 17],
          // 35
          [12, 151, 121, 7, 152, 122],
          [12, 75, 47, 26, 76, 48],
          [39, 54, 24, 14, 55, 25],
          [22, 45, 15, 41, 46, 16],
          // 36
          [6, 151, 121, 14, 152, 122],
          [6, 75, 47, 34, 76, 48],
          [46, 54, 24, 10, 55, 25],
          [2, 45, 15, 64, 46, 16],
          // 37
          [17, 152, 122, 4, 153, 123],
          [29, 74, 46, 14, 75, 47],
          [49, 54, 24, 10, 55, 25],
          [24, 45, 15, 46, 46, 16],
          // 38
          [4, 152, 122, 18, 153, 123],
          [13, 74, 46, 32, 75, 47],
          [48, 54, 24, 14, 55, 25],
          [42, 45, 15, 32, 46, 16],
          // 39
          [20, 147, 117, 4, 148, 118],
          [40, 75, 47, 7, 76, 48],
          [43, 54, 24, 22, 55, 25],
          [10, 45, 15, 67, 46, 16],
          // 40
          [19, 148, 118, 6, 149, 119],
          [18, 75, 47, 31, 76, 48],
          [34, 54, 24, 34, 55, 25],
          [20, 45, 15, 61, 46, 16]
        ];
        var qrRSBlock = function(totalCount, dataCount) {
          var _this2 = {};
          _this2.totalCount = totalCount;
          _this2.dataCount = dataCount;
          return _this2;
        };
        var _this = {};
        var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {
          switch (errorCorrectionLevel) {
            case QRErrorCorrectionLevel.L:
              return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
            case QRErrorCorrectionLevel.M:
              return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
            case QRErrorCorrectionLevel.Q:
              return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
            case QRErrorCorrectionLevel.H:
              return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
            default:
              return void 0;
          }
        };
        _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {
          var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);
          if (typeof rsBlock == "undefined") {
            throw "bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel;
          }
          var length = rsBlock.length / 3;
          var list = [];
          for (var i = 0; i < length; i += 1) {
            var count = rsBlock[i * 3 + 0];
            var totalCount = rsBlock[i * 3 + 1];
            var dataCount = rsBlock[i * 3 + 2];
            for (var j = 0; j < count; j += 1) {
              list.push(qrRSBlock(totalCount, dataCount));
            }
          }
          return list;
        };
        return _this;
      })();
      var qrBitBuffer = function() {
        var _buffer = [];
        var _length = 0;
        var _this = {};
        _this.getBuffer = function() {
          return _buffer;
        };
        _this.getAt = function(index) {
          var bufIndex = Math.floor(index / 8);
          return (_buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
        };
        _this.put = function(num, length) {
          for (var i = 0; i < length; i += 1) {
            _this.putBit((num >>> length - i - 1 & 1) == 1);
          }
        };
        _this.getLengthInBits = function() {
          return _length;
        };
        _this.putBit = function(bit) {
          var bufIndex = Math.floor(_length / 8);
          if (_buffer.length <= bufIndex) {
            _buffer.push(0);
          }
          if (bit) {
            _buffer[bufIndex] |= 128 >>> _length % 8;
          }
          _length += 1;
        };
        return _this;
      };
      var qrNumber = function(data) {
        var _mode = QRMode.MODE_NUMBER;
        var _data = data;
        var _this = {};
        _this.getMode = function() {
          return _mode;
        };
        _this.getLength = function(buffer) {
          return _data.length;
        };
        _this.write = function(buffer) {
          var data2 = _data;
          var i = 0;
          while (i + 2 < data2.length) {
            buffer.put(strToNum(data2.substring(i, i + 3)), 10);
            i += 3;
          }
          if (i < data2.length) {
            if (data2.length - i == 1) {
              buffer.put(strToNum(data2.substring(i, i + 1)), 4);
            } else if (data2.length - i == 2) {
              buffer.put(strToNum(data2.substring(i, i + 2)), 7);
            }
          }
        };
        var strToNum = function(s) {
          var num = 0;
          for (var i = 0; i < s.length; i += 1) {
            num = num * 10 + chatToNum(s.charAt(i));
          }
          return num;
        };
        var chatToNum = function(c) {
          if ("0" <= c && c <= "9") {
            return c.charCodeAt(0) - "0".charCodeAt(0);
          }
          throw "illegal char :" + c;
        };
        return _this;
      };
      var qrAlphaNum = function(data) {
        var _mode = QRMode.MODE_ALPHA_NUM;
        var _data = data;
        var _this = {};
        _this.getMode = function() {
          return _mode;
        };
        _this.getLength = function(buffer) {
          return _data.length;
        };
        _this.write = function(buffer) {
          var s = _data;
          var i = 0;
          while (i + 1 < s.length) {
            buffer.put(
              getCode(s.charAt(i)) * 45 + getCode(s.charAt(i + 1)),
              11
            );
            i += 2;
          }
          if (i < s.length) {
            buffer.put(getCode(s.charAt(i)), 6);
          }
        };
        var getCode = function(c) {
          if ("0" <= c && c <= "9") {
            return c.charCodeAt(0) - "0".charCodeAt(0);
          } else if ("A" <= c && c <= "Z") {
            return c.charCodeAt(0) - "A".charCodeAt(0) + 10;
          } else {
            switch (c) {
              case " ":
                return 36;
              case "$":
                return 37;
              case "%":
                return 38;
              case "*":
                return 39;
              case "+":
                return 40;
              case "-":
                return 41;
              case ".":
                return 42;
              case "/":
                return 43;
              case ":":
                return 44;
              default:
                throw "illegal char :" + c;
            }
          }
        };
        return _this;
      };
      var qr8BitByte = function(data) {
        var _mode = QRMode.MODE_8BIT_BYTE;
        var _data = data;
        var _bytes = qrcode3.stringToBytes(data);
        var _this = {};
        _this.getMode = function() {
          return _mode;
        };
        _this.getLength = function(buffer) {
          return _bytes.length;
        };
        _this.write = function(buffer) {
          for (var i = 0; i < _bytes.length; i += 1) {
            buffer.put(_bytes[i], 8);
          }
        };
        return _this;
      };
      var qrKanji = function(data) {
        var _mode = QRMode.MODE_KANJI;
        var _data = data;
        var stringToBytes = qrcode3.stringToBytesFuncs["SJIS"];
        if (!stringToBytes) {
          throw "sjis not supported.";
        }
        !(function(c, code) {
          var test = stringToBytes(c);
          if (test.length != 2 || (test[0] << 8 | test[1]) != code) {
            throw "sjis not supported.";
          }
        })("友", 38726);
        var _bytes = stringToBytes(data);
        var _this = {};
        _this.getMode = function() {
          return _mode;
        };
        _this.getLength = function(buffer) {
          return ~~(_bytes.length / 2);
        };
        _this.write = function(buffer) {
          var data2 = _bytes;
          var i = 0;
          while (i + 1 < data2.length) {
            var c = (255 & data2[i]) << 8 | 255 & data2[i + 1];
            if (33088 <= c && c <= 40956) {
              c -= 33088;
            } else if (57408 <= c && c <= 60351) {
              c -= 49472;
            } else {
              throw "illegal char at " + (i + 1) + "/" + c;
            }
            c = (c >>> 8 & 255) * 192 + (c & 255);
            buffer.put(c, 13);
            i += 2;
          }
          if (i < data2.length) {
            throw "illegal char at " + (i + 1);
          }
        };
        return _this;
      };
      var byteArrayOutputStream = function() {
        var _bytes = [];
        var _this = {};
        _this.writeByte = function(b) {
          _bytes.push(b & 255);
        };
        _this.writeShort = function(i) {
          _this.writeByte(i);
          _this.writeByte(i >>> 8);
        };
        _this.writeBytes = function(b, off, len) {
          off = off || 0;
          len = len || b.length;
          for (var i = 0; i < len; i += 1) {
            _this.writeByte(b[i + off]);
          }
        };
        _this.writeString = function(s) {
          for (var i = 0; i < s.length; i += 1) {
            _this.writeByte(s.charCodeAt(i));
          }
        };
        _this.toByteArray = function() {
          return _bytes;
        };
        _this.toString = function() {
          var s = "";
          s += "[";
          for (var i = 0; i < _bytes.length; i += 1) {
            if (i > 0) {
              s += ",";
            }
            s += _bytes[i];
          }
          s += "]";
          return s;
        };
        return _this;
      };
      var base64EncodeOutputStream = function() {
        var _buffer = 0;
        var _buflen = 0;
        var _length = 0;
        var _base64 = "";
        var _this = {};
        var writeEncoded = function(b) {
          _base64 += String.fromCharCode(encode(b & 63));
        };
        var encode = function(n) {
          if (n < 0) {
          } else if (n < 26) {
            return 65 + n;
          } else if (n < 52) {
            return 97 + (n - 26);
          } else if (n < 62) {
            return 48 + (n - 52);
          } else if (n == 62) {
            return 43;
          } else if (n == 63) {
            return 47;
          }
          throw "n:" + n;
        };
        _this.writeByte = function(n) {
          _buffer = _buffer << 8 | n & 255;
          _buflen += 8;
          _length += 1;
          while (_buflen >= 6) {
            writeEncoded(_buffer >>> _buflen - 6);
            _buflen -= 6;
          }
        };
        _this.flush = function() {
          if (_buflen > 0) {
            writeEncoded(_buffer << 6 - _buflen);
            _buffer = 0;
            _buflen = 0;
          }
          if (_length % 3 != 0) {
            var padlen = 3 - _length % 3;
            for (var i = 0; i < padlen; i += 1) {
              _base64 += "=";
            }
          }
        };
        _this.toString = function() {
          return _base64;
        };
        return _this;
      };
      var base64DecodeInputStream = function(str) {
        var _str = str;
        var _pos = 0;
        var _buffer = 0;
        var _buflen = 0;
        var _this = {};
        _this.read = function() {
          while (_buflen < 8) {
            if (_pos >= _str.length) {
              if (_buflen == 0) {
                return -1;
              }
              throw "unexpected end of file./" + _buflen;
            }
            var c = _str.charAt(_pos);
            _pos += 1;
            if (c == "=") {
              _buflen = 0;
              return -1;
            } else if (c.match(/^\s$/)) {
              continue;
            }
            _buffer = _buffer << 6 | decode(c.charCodeAt(0));
            _buflen += 6;
          }
          var n = _buffer >>> _buflen - 8 & 255;
          _buflen -= 8;
          return n;
        };
        var decode = function(c) {
          if (65 <= c && c <= 90) {
            return c - 65;
          } else if (97 <= c && c <= 122) {
            return c - 97 + 26;
          } else if (48 <= c && c <= 57) {
            return c - 48 + 52;
          } else if (c == 43) {
            return 62;
          } else if (c == 47) {
            return 63;
          } else {
            throw "c:" + c;
          }
        };
        return _this;
      };
      var gifImage = function(width, height) {
        var _width = width;
        var _height = height;
        var _data = new Array(width * height);
        var _this = {};
        _this.setPixel = function(x, y, pixel) {
          _data[y * _width + x] = pixel;
        };
        _this.write = function(out) {
          out.writeString("GIF87a");
          out.writeShort(_width);
          out.writeShort(_height);
          out.writeByte(128);
          out.writeByte(0);
          out.writeByte(0);
          out.writeByte(0);
          out.writeByte(0);
          out.writeByte(0);
          out.writeByte(255);
          out.writeByte(255);
          out.writeByte(255);
          out.writeString(",");
          out.writeShort(0);
          out.writeShort(0);
          out.writeShort(_width);
          out.writeShort(_height);
          out.writeByte(0);
          var lzwMinCodeSize = 2;
          var raster = getLZWRaster(lzwMinCodeSize);
          out.writeByte(lzwMinCodeSize);
          var offset = 0;
          while (raster.length - offset > 255) {
            out.writeByte(255);
            out.writeBytes(raster, offset, 255);
            offset += 255;
          }
          out.writeByte(raster.length - offset);
          out.writeBytes(raster, offset, raster.length - offset);
          out.writeByte(0);
          out.writeString(";");
        };
        var bitOutputStream = function(out) {
          var _out = out;
          var _bitLength = 0;
          var _bitBuffer = 0;
          var _this2 = {};
          _this2.write = function(data, length) {
            if (data >>> length != 0) {
              throw "length over";
            }
            while (_bitLength + length >= 8) {
              _out.writeByte(255 & (data << _bitLength | _bitBuffer));
              length -= 8 - _bitLength;
              data >>>= 8 - _bitLength;
              _bitBuffer = 0;
              _bitLength = 0;
            }
            _bitBuffer = data << _bitLength | _bitBuffer;
            _bitLength = _bitLength + length;
          };
          _this2.flush = function() {
            if (_bitLength > 0) {
              _out.writeByte(_bitBuffer);
            }
          };
          return _this2;
        };
        var getLZWRaster = function(lzwMinCodeSize) {
          var clearCode = 1 << lzwMinCodeSize;
          var endCode = (1 << lzwMinCodeSize) + 1;
          var bitLength = lzwMinCodeSize + 1;
          var table = lzwTable();
          for (var i = 0; i < clearCode; i += 1) {
            table.add(String.fromCharCode(i));
          }
          table.add(String.fromCharCode(clearCode));
          table.add(String.fromCharCode(endCode));
          var byteOut = byteArrayOutputStream();
          var bitOut = bitOutputStream(byteOut);
          bitOut.write(clearCode, bitLength);
          var dataIndex = 0;
          var s = String.fromCharCode(_data[dataIndex]);
          dataIndex += 1;
          while (dataIndex < _data.length) {
            var c = String.fromCharCode(_data[dataIndex]);
            dataIndex += 1;
            if (table.contains(s + c)) {
              s = s + c;
            } else {
              bitOut.write(table.indexOf(s), bitLength);
              if (table.size() < 4095) {
                if (table.size() == 1 << bitLength) {
                  bitLength += 1;
                }
                table.add(s + c);
              }
              s = c;
            }
          }
          bitOut.write(table.indexOf(s), bitLength);
          bitOut.write(endCode, bitLength);
          bitOut.flush();
          return byteOut.toByteArray();
        };
        var lzwTable = function() {
          var _map = {};
          var _size = 0;
          var _this2 = {};
          _this2.add = function(key) {
            if (_this2.contains(key)) {
              throw "dup key:" + key;
            }
            _map[key] = _size;
            _size += 1;
          };
          _this2.size = function() {
            return _size;
          };
          _this2.indexOf = function(key) {
            return _map[key];
          };
          _this2.contains = function(key) {
            return typeof _map[key] != "undefined";
          };
          return _this2;
        };
        return _this;
      };
      var createDataURL = function(width, height, getPixel) {
        var gif = gifImage(width, height);
        for (var y = 0; y < height; y += 1) {
          for (var x = 0; x < width; x += 1) {
            gif.setPixel(x, y, getPixel(x, y));
          }
        }
        var b = byteArrayOutputStream();
        gif.write(b);
        var base64 = base64EncodeOutputStream();
        var bytes = b.toByteArray();
        for (var i = 0; i < bytes.length; i += 1) {
          base64.writeByte(bytes[i]);
        }
        base64.flush();
        return "data:image/gif;base64," + base64;
      };
      return qrcode3;
    })();
    !(function() {
      qrcode2.stringToBytesFuncs["UTF-8"] = function(s) {
        function toUTF8Array(str) {
          var utf8 = [];
          for (var i = 0; i < str.length; i++) {
            var charcode = str.charCodeAt(i);
            if (charcode < 128) utf8.push(charcode);
            else if (charcode < 2048) {
              utf8.push(
                192 | charcode >> 6,
                128 | charcode & 63
              );
            } else if (charcode < 55296 || charcode >= 57344) {
              utf8.push(
                224 | charcode >> 12,
                128 | charcode >> 6 & 63,
                128 | charcode & 63
              );
            } else {
              i++;
              charcode = 65536 + ((charcode & 1023) << 10 | str.charCodeAt(i) & 1023);
              utf8.push(
                240 | charcode >> 18,
                128 | charcode >> 12 & 63,
                128 | charcode >> 6 & 63,
                128 | charcode & 63
              );
            }
          }
          return utf8;
        }
        return toUTF8Array(s);
      };
    })();
    (function(factory) {
      if (typeof define === "function" && define.amd) {
        define([], factory);
      } else if (typeof exports === "object") {
        module.exports = factory();
      }
    })(function() {
      return qrcode2;
    });
  }
});

// node_modules/@tinyfx/runtime/dist/signals.js
var effectStack = [];
function signal(v) {
  let value = v;
  const subs = /* @__PURE__ */ new Set();
  const fn = () => {
    const running = effectStack[effectStack.length - 1];
    if (running)
      subs.add(running);
    return value;
  };
  fn.set = (next) => {
    if (Object.is(next, value))
      return;
    value = next;
    subs.forEach((s) => s());
  };
  return fn;
}
function effect(fn) {
  const run = () => {
    effectStack.push(run);
    try {
      fn();
    } finally {
      effectStack.pop();
    }
  };
  run();
}

// node_modules/@tinyfx/runtime/dist/http/data.js
function httpError(status, statusText, url, method, response) {
  return { kind: "http", status, statusText, url, method, response };
}
function timeoutError(url, timeout) {
  return { kind: "timeout", url, timeout };
}
function parseError(message, url) {
  return { kind: "parse", message, url };
}
function isHttpError(err) {
  return typeof err === "object" && err !== null && "kind" in err && err.kind === "http";
}

// node_modules/@tinyfx/runtime/dist/http/helper.js
function buildUrl(url, base, params) {
  const fullUrl = base + url;
  if (!params || Object.keys(params).length === 0)
    return fullUrl;
  const urlObj = new URL(fullUrl, typeof window !== "undefined" ? window.location.href : "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.append(key, String(value));
  });
  return urlObj.toString().replace(urlObj.origin, "");
}
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// node_modules/@tinyfx/runtime/dist/http/http.js
function createHttp(config = {}) {
  var _a, _b, _c, _d, _e, _f, _g;
  const base = (_a = config.baseUrl) !== null && _a !== void 0 ? _a : "";
  const defaultHeaders = (_b = config.headers) !== null && _b !== void 0 ? _b : {};
  const defaultTimeout = (_c = config.timeout) !== null && _c !== void 0 ? _c : 3e4;
  const maxRetries = (_d = config.retries) !== null && _d !== void 0 ? _d : 0;
  const retryDelay = (_e = config.retryDelay) !== null && _e !== void 0 ? _e : 1e3;
  const requestInterceptors = (_f = config.requestInterceptors) !== null && _f !== void 0 ? _f : [];
  const responseInterceptors = (_g = config.responseInterceptors) !== null && _g !== void 0 ? _g : [];
  async function request(method, url, body, options = {}) {
    var _a2, _b2, _c2;
    const fullUrl = buildUrl(url, base, options.params);
    const timeoutMs = (_a2 = options.timeout) !== null && _a2 !== void 0 ? _a2 : defaultTimeout;
    const useJson = (_b2 = options.json) !== null && _b2 !== void 0 ? _b2 : true;
    let attempts = 0;
    const maxAttempts = maxRetries + 1;
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const headers = Object.assign(Object.assign({}, defaultHeaders), options.headers);
        if (body !== void 0 && useJson && !headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
        const serializedBody = body !== void 0 ? useJson ? JSON.stringify(body) : body : void 0;
        let fetchOptions = {
          method,
          headers,
          body: serializedBody,
          signal: options.signal
        };
        let requestUrl = fullUrl;
        for (const interceptor of requestInterceptors) {
          const result = await interceptor(requestUrl, fetchOptions);
          requestUrl = result.url;
          fetchOptions = result.options;
        }
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
        let combinedSignal = timeoutController.signal;
        if (options.signal) {
          const combinedController = new AbortController();
          const abortHandler = () => combinedController.abort();
          options.signal.addEventListener("abort", abortHandler, { once: true });
          timeoutController.signal.addEventListener("abort", abortHandler, { once: true });
          combinedSignal = combinedController.signal;
        }
        fetchOptions.signal = combinedSignal;
        let res;
        try {
          res = await fetch(requestUrl, fetchOptions);
        } catch (err) {
          clearTimeout(timeoutId);
          if (err instanceof Error && err.name === "AbortError") {
            if ((_c2 = options.signal) === null || _c2 === void 0 ? void 0 : _c2.aborted) {
              throw err;
            }
            throw timeoutError(requestUrl, timeoutMs);
          }
          throw err;
        } finally {
          clearTimeout(timeoutId);
        }
        for (const interceptor of responseInterceptors) {
          res = await interceptor(res);
        }
        if (!res.ok) {
          throw httpError(res.status, res.statusText, requestUrl, method, res);
        }
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            const text = await res.text();
            if (!text || text.trim().length === 0) {
              return void 0;
            }
            return JSON.parse(text);
          } catch (err) {
            throw parseError(`Failed to parse JSON response: ${err instanceof Error ? err.message : "Unknown error"}`, requestUrl);
          }
        }
        if (contentType.includes("text/")) {
          return await res.text();
        }
        try {
          const text = await res.text();
          return text || void 0;
        } catch (_d2) {
          return void 0;
        }
      } catch (err) {
        const is5xx = isHttpError(err) && err.status >= 500 && err.status < 600;
        const shouldRetry = attempts < maxAttempts && (!isHttpError(err) || is5xx);
        if (shouldRetry) {
          await sleep(retryDelay * attempts);
          continue;
        }
        throw err;
      }
    }
    throw new Error("Max retries exceeded");
  }
  return {
    get: (url, options) => request("GET", url, void 0, options),
    post: (url, body, options) => request("POST", url, body, options),
    put: (url, body, options) => request("PUT", url, body, options),
    patch: (url, body, options) => request("PATCH", url, body, options),
    del: (url, options) => request("DELETE", url, void 0, options),
    delete: (url, options) => request("DELETE", url, void 0, options)
  };
}

// node_modules/@tinyfx/runtime/dist/registry.js
var factories = /* @__PURE__ */ new Map();
function registerComponent(name, factory) {
  factories.set(name, factory);
}

// node_modules/@tinyfx/runtime/dist/page-registry.js
var modules = /* @__PURE__ */ new Map();
function registerPage(path, module) {
  modules.set(path, module);
}
function runPageInit(path, ctx) {
  const mod = modules.get(path);
  if (typeof (mod === null || mod === void 0 ? void 0 : mod.init) === "function") {
    mod.init(document.body, ctx);
  }
}

// node_modules/@tinyfx/runtime/dist/mount-state.js
var mounted = /* @__PURE__ */ new WeakSet();
function markMounted(el) {
  if (mounted.has(el))
    return false;
  mounted.add(el);
  return true;
}

// node_modules/@tinyfx/runtime/dist/router/path-matcher.js
function matchPath(def, pathSegments) {
  const { staticSegments, paramNames } = def;
  if (staticSegments.length !== pathSegments.length)
    return null;
  const params = {};
  let paramIdx = 0;
  for (let i = 0; i < staticSegments.length; i++) {
    const expected = staticSegments[i];
    const actual = pathSegments[i];
    if (expected === null) {
      params[paramNames[paramIdx++]] = decodeURIComponent(actual);
    } else if (expected !== actual) {
      return null;
    }
  }
  return params;
}
function splitPath(pathname) {
  return pathname.split("/").filter(Boolean);
}

// node_modules/@tinyfx/runtime/dist/router/lifecycle.js
var mountCallbacks = [];
var destroyCallbacks = [];
function onMount(fn) {
  if (document.readyState === "loading") {
    mountCallbacks.push(fn);
    return;
  }
  fn();
}
function onDestroy(fn) {
  destroyCallbacks.push(fn);
}
function flushMount() {
  const run = () => mountCallbacks.forEach((fn) => fn());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
function initLifecycle() {
  flushMount();
  window.addEventListener("pagehide", () => destroyCallbacks.forEach((fn) => fn()), { once: true });
}

// node_modules/@tinyfx/runtime/dist/router/active-links.js
function highlightActiveLinks(pathname) {
  const links = document.querySelectorAll("a[href]");
  links.forEach((link) => {
    try {
      const url = new URL(link.getAttribute("href"), window.location.origin);
      if (url.pathname === pathname) {
        link.setAttribute("data-active", "true");
      } else {
        link.removeAttribute("data-active");
      }
    } catch (_a) {
    }
  });
}

// node_modules/@tinyfx/runtime/dist/router/params.js
var currentParams = {};
function setParams(params) {
  currentParams = params;
}

// node_modules/@tinyfx/runtime/dist/router/index.js
function navigate(path) {
  window.location.href = path;
}

// node_modules/@tinyfx/runtime/dist/init.js
var initialized = false;
function init(config) {
  if (initialized)
    return null;
  initialized = true;
  const pathname = window.location.pathname;
  const pathSegments = splitPath(pathname);
  let matchedPath = null;
  let params = {};
  for (const [path, def] of Object.entries(config.routes)) {
    const result = matchPath(def, pathSegments);
    if (result) {
      matchedPath = path;
      params = result;
      break;
    }
  }
  if (!matchedPath) {
    if (true) {
      console.warn(`[tinyfx] No route matched for pathname: "${pathname}". Check that a page file exists for this URL in src/pages/.`);
    }
    return null;
  }
  initLifecycle();
  highlightActiveLinks(pathname);
  setParams(params);
  const ctx = { params, navigate };
  if (config.setupDirectives) {
    config.setupDirectives(ctx);
  }
  runPageInit(matchedPath, ctx);
  return ctx;
}

// src/components/ConfigForm/ConfigForm.ts
var ConfigForm_exports = {};
__export(ConfigForm_exports, {
  ConfigForm: () => ConfigForm,
  mount: () => mount
});

// src/lib/config.ts
var API_BASE = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";

// src/lib/services/http.ts
var http = createHttp({ baseUrl: API_BASE });
var originalFetch = window.fetch.bind(window);
window.fetch = (input, init6) => {
  const nextInit = {
    credentials: "include",
    ...init6
  };
  return originalFetch(input, nextInit);
};
function triggerDownload(url) {
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// src/lib/services/config.service.ts
var ConfigService = {
  async getConfig() {
    return http.get("/config/api");
  },
  async updateConfig(payload) {
    await http.put("/config/api", JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

// src/lib/models/server-config.model.ts
var ServerConfigModel = class _ServerConfigModel {
  constructor(dto) {
    __publicField(this, "port");
    __publicField(this, "basePath");
    __publicField(this, "maxSizeMb");
    __publicField(this, "authEnabled");
    __publicField(this, "loggingEnabled");
    __publicField(this, "loggingLevel");
    this.port = dto.server.port;
    this.basePath = dto.storage.base_path;
    this.maxSizeMb = Math.max(1, Math.round(dto.storage.max_size / (1024 * 1024)));
    this.authEnabled = dto.auth.authentication;
    this.loggingEnabled = dto.logging.logging;
    this.loggingLevel = dto.logging.logging_level;
  }
  static fromDto(dto) {
    return new _ServerConfigModel(dto);
  }
  toPayload() {
    return {
      server: { port: this.port },
      tls: { tls_enabled: false, cert_file: "", key_file: "" },
      storage: {
        base_path: this.basePath,
        max_size: this.maxSizeMb * 1024 * 1024
      },
      auth: { authentication: this.authEnabled },
      logging: {
        logging: this.loggingEnabled,
        logging_level: this.loggingLevel
      }
    };
  }
};

// src/components/ConfigForm/ConfigForm.ts
var ConfigForm = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "isLoading", signal(true));
    __publicField(this, "alertMessage", signal(""));
    __publicField(this, "alertType", signal("info"));
    __publicField(this, "initialConfig", null);
  }
  init() {
    const form = this.el.querySelector("[data-config-form]");
    const resetBtn = this.el.querySelector("[data-reset-btn]");
    const portInput = this.el.querySelector("[data-port]");
    const maxSizeInput = this.el.querySelector("[data-max-size]");
    const basePathInput = this.el.querySelector("[data-base-path]");
    const authCheckbox = this.el.querySelector("[data-auth-enabled]");
    const loggingCheckbox = this.el.querySelector("[data-logging-enabled]");
    const loggingLevelSelect = this.el.querySelector("[data-logging-level]");
    this.loadConfig();
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!this.initialConfig) return;
      const payload = {
        server: { port: Number(portInput?.value) },
        tls: { tls_enabled: false, cert_file: "", key_file: "" },
        storage: {
          base_path: basePathInput?.value.trim() || "",
          max_size: Number(maxSizeInput?.value) * 1024 * 1024
        },
        auth: { authentication: !!authCheckbox?.checked },
        logging: {
          logging: !!loggingCheckbox?.checked,
          logging_level: loggingLevelSelect?.value || "info"
        }
      };
      try {
        await ConfigService.updateConfig(payload);
        this.showAlert("Config saved. Some changes require a restart.", "success");
        this.initialConfig = ServerConfigModel.fromDto(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save config";
        this.showAlert(message, "error");
      }
    });
    resetBtn?.addEventListener("click", () => {
      if (!this.initialConfig) return;
      this.populateForm(this.initialConfig);
      this.showAlert("Changes reset.", "info");
    });
    effect(() => {
      const alertBox = this.el.querySelector("[data-alert]");
      if (alertBox) {
        const msg = this.alertMessage();
        alertBox.style.display = msg ? "block" : "none";
        if (msg) alertBox.textContent = msg;
      }
    });
  }
  async loadConfig() {
    try {
      const dto = await ConfigService.getConfig();
      this.initialConfig = ServerConfigModel.fromDto(dto);
      this.populateForm(this.initialConfig);
      this.isLoading.set(false);
    } catch {
      this.showAlert("Failed to load config. Please refresh.", "error");
    }
  }
  populateForm(config) {
    const portInput = this.el.querySelector("[data-port]");
    const maxSizeInput = this.el.querySelector("[data-max-size]");
    const basePathInput = this.el.querySelector("[data-base-path]");
    const authCheckbox = this.el.querySelector("[data-auth-enabled]");
    const loggingCheckbox = this.el.querySelector("[data-logging-enabled]");
    const loggingLevelSelect = this.el.querySelector("[data-logging-level]");
    if (portInput) portInput.value = String(config.port);
    if (maxSizeInput) maxSizeInput.value = String(config.maxSizeMb);
    if (basePathInput) basePathInput.value = config.basePath;
    if (authCheckbox) authCheckbox.checked = config.authEnabled;
    if (loggingCheckbox) loggingCheckbox.checked = config.loggingEnabled;
    if (loggingLevelSelect) loggingLevelSelect.value = config.loggingLevel;
  }
  showAlert(message, type) {
    this.alertMessage.set(message);
    this.alertType.set(type);
    const alertBox = this.el.querySelector("[data-alert]");
    if (alertBox) {
      alertBox.style.display = "block";
      alertBox.textContent = message;
      alertBox.className = `retro-card-sm px-4 py-3 font-semibold alert-${type}`;
    }
  }
};
function mount(el, ctx) {
  const inst = new ConfigForm(el, ctx);
  inst.init();
  return inst;
}

// src/components/DeleteModal/DeleteModal.ts
var DeleteModal_exports = {};
__export(DeleteModal_exports, {
  DeleteModal: () => DeleteModal,
  mount: () => mount2
});

// src/lib/state/modal-callbacks.state.ts
var deleteCallback = signal(null);
var pinCallback = signal(null);
var deleteModalState = signal({
  name: "",
  type: "file",
  visible: false
});
var pinModalState = signal({
  action: null,
  visible: false
});
var shareModalState = signal({
  url: "",
  visible: false
});

// src/components/DeleteModal/DeleteModal.ts
var DeleteModal = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "visible", signal(false));
    __publicField(this, "itemName", signal(""));
    __publicField(this, "itemType", signal("file"));
  }
  init() {
    effect(() => {
      const state = deleteModalState();
      this.visible.set(state.visible);
      if (state.visible) {
        this.itemName.set(state.name);
        this.itemType.set(state.type);
      }
    });
    effect(() => {
      this.el.classList.toggle("show", this.visible());
      if (this.visible()) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    });
    effect(() => {
      const nameEl = this.el.querySelector(".file-name-display");
      if (nameEl) nameEl.textContent = this.itemName();
    });
    effect(() => {
      const typeEl = this.el.querySelector(".modal-body > p");
      if (typeEl) typeEl.textContent = `Are you sure you want to delete this ${this.itemType()}?`;
    });
    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.hide();
    });
    this.el.querySelector("[data-action='close']")?.addEventListener("click", () => this.hide());
    this.el.querySelector("[data-action='cancel']")?.addEventListener("click", () => this.hide());
    this.el.querySelector("[data-action='confirm']")?.addEventListener("click", () => this.handleConfirm());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.visible()) this.hide();
    });
  }
  hide() {
    this.visible.set(false);
    deleteModalState.set({ name: "", type: "file", visible: false });
    deleteCallback.set(null);
  }
  handleConfirm() {
    const cb = deleteCallback();
    if (cb) cb();
    this.hide();
  }
};
function mount2(el, ctx) {
  const inst = new DeleteModal(el, ctx);
  inst.init();
  return inst;
}

// src/components/Navbar/Navbar.ts
var Navbar_exports = {};
__export(Navbar_exports, {
  Navbar: () => Navbar,
  mount: () => mount3
});

// src/lib/state/auth.state.ts
var authState = signal({
  checked: false,
  loggedIn: false,
  authEnabled: false,
  user: ""
});

// src/lib/services/session.service.ts
var SessionService = {
  async checkAuth() {
    try {
      const response = await fetch("/auth/status", { credentials: "include" });
      if (!response.ok) {
        throw new Error("auth status failed");
      }
      const status = await response.json();
      authState.set({
        checked: true,
        loggedIn: !!status?.loggedIn,
        authEnabled: !!status?.authEnabled,
        user: status?.user || ""
      });
    } catch {
      authState.set({
        checked: true,
        loggedIn: false,
        authEnabled: false,
        user: ""
      });
    }
  },
  markLoggedOut() {
    authState.set({
      checked: true,
      loggedIn: false,
      authEnabled: authState().authEnabled,
      user: ""
    });
  }
};

// src/lib/services/auth.service.ts
var AuthService = {
  async login(username, password) {
    try {
      const response = await fetch("/login", {
        method: "POST",
        body: new URLSearchParams({ username, password }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        credentials: "include",
        redirect: "follow"
      });
      if (!response.ok) {
        let errorMsg = "Login failed";
        try {
          const text = await response.text();
          if (text) errorMsg = text;
        } catch {
        }
        return { ok: false, error: errorMsg };
      }
      await SessionService.checkAuth();
      if (!response.redirected && !response.url.includes("/dashboard")) {
        return { ok: false, error: "Login failed" };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Login failed" };
    }
  },
  async logout() {
    try {
      await http.post("/logout");
    } catch {
    }
    SessionService.markLoggedOut();
    window.location.href = "/login";
  }
};

// src/components/Navbar/Navbar.ts
var Navbar = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "isLoggedIn", signal(false));
    __publicField(this, "links", [
      { label: "Files", url: "/", active: false },
      { label: "Dashboard", url: "/dashboard", active: false },
      { label: "Config", url: "/config", active: false }
    ]);
  }
  init() {
    const loginBtn = this.el.querySelector("#loginBtn");
    const logoutBtn = this.el.querySelector("#logoutBtn");
    this.isLoggedIn.set(authState().loggedIn);
    effect(() => {
      this.isLoggedIn.set(authState().loggedIn);
    });
    const render = () => {
      const loggedIn = this.isLoggedIn();
      this.renderLinks(loggedIn);
      if (loginBtn) loginBtn.hidden = loggedIn;
      if (logoutBtn) logoutBtn.hidden = !loggedIn;
    };
    render();
    effect(() => {
      this.isLoggedIn();
      render();
    });
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => AuthService.logout());
    }
  }
  renderLinks(loggedIn) {
    const nav = this.el.querySelector("[data-nav-links]");
    if (!nav) return;
    nav.querySelectorAll("a[data-nav-link]").forEach((node) => node.remove());
    const visibleLinks = loggedIn ? this.links : [];
    const loginBtn = nav.querySelector("#loginBtn");
    const currentPath = window.location.pathname;
    visibleLinks.forEach((link) => {
      const anchor = document.createElement("a");
      anchor.setAttribute("data-nav-link", "true");
      anchor.href = link.url;
      const isActive = currentPath === link.url;
      anchor.className = isActive ? "nav-link active" : "nav-link";
      anchor.textContent = link.label;
      if (loginBtn) {
        nav.insertBefore(anchor, loginBtn);
      } else {
        nav.appendChild(anchor);
      }
    });
  }
};
function mount3(el, ctx) {
  const inst = new Navbar(el, ctx);
  inst.init();
  return inst;
}

// src/components/PinModal/PinModal.ts
var PinModal_exports = {};
__export(PinModal_exports, {
  PinModal: () => PinModal,
  mount: () => mount4
});
var PinModal = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "visible", signal(false));
    __publicField(this, "title", signal("Enter PIN"));
    __publicField(this, "description", signal("This item is protected. Please enter the PIN:"));
    __publicField(this, "submitLabel", signal("Download"));
    __publicField(this, "pinValue", signal(""));
    __publicField(this, "pendingAction", null);
  }
  init() {
    effect(() => {
      const state = pinModalState();
      this.visible.set(state.visible);
      if (state.visible && state.action) {
        this.pendingAction = state.action;
        this.updateCopy(state.action.type);
        this.pinValue.set("");
        const input2 = this.el.querySelector("[data-pin-input]");
        if (input2) {
          input2.value = "";
          setTimeout(() => input2.focus(), 50);
        }
      }
    });
    effect(() => {
      this.el.classList.toggle("show", this.visible());
      if (this.visible()) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    });
    effect(() => {
      const titleEl = this.el.querySelector(".modal-header h3");
      if (titleEl) titleEl.textContent = this.title();
    });
    effect(() => {
      const descEl = this.el.querySelector(".modal-body > p");
      if (descEl) descEl.textContent = this.description();
    });
    effect(() => {
      const submitBtn2 = this.el.querySelector("[data-action='submit']");
      if (submitBtn2) submitBtn2.textContent = this.submitLabel();
    });
    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.hide();
    });
    const closeBtn = this.el.querySelector("[data-action='close']");
    closeBtn?.addEventListener("click", () => this.hide());
    const cancelBtn = this.el.querySelector("[data-action='cancel']");
    cancelBtn?.addEventListener("click", () => this.hide());
    const submitBtn = this.el.querySelector("[data-action='submit']");
    submitBtn?.addEventListener("click", () => this.handleSubmit());
    const input = this.el.querySelector("[data-pin-input]");
    input?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleSubmit();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.visible()) this.hide();
    });
  }
  hide() {
    this.visible.set(false);
    this.pendingAction = null;
    this.pinValue.set("");
    pinModalState.set({ action: null, visible: false });
    pinCallback.set(null);
  }
  handleSubmit() {
    const input = this.el.querySelector("[data-pin-input]");
    const pin = input?.value.trim() || "";
    if (!pin) return;
    const cb = pinCallback();
    if (this.pendingAction && cb) {
      cb(pin, this.pendingAction);
    }
  }
  updateCopy(actionType) {
    const isFolderOpen = actionType === "folder-open";
    const isFolderDownload = actionType === "folder-download";
    if (isFolderOpen) {
      this.title.set("Enter PIN");
      this.description.set("This folder is protected. Please enter the PIN to open:");
      this.submitLabel.set("Open");
    } else if (isFolderDownload) {
      this.title.set("Enter PIN");
      this.description.set("This folder is protected. Please enter the PIN to download:");
      this.submitLabel.set("Download");
    } else {
      this.title.set("Enter PIN");
      this.description.set("This file is protected. Please enter the PIN to download:");
      this.submitLabel.set("Download");
    }
  }
};
function mount4(el, ctx) {
  const inst = new PinModal(el, ctx);
  inst.init();
  return inst;
}

// src/components/ShareModal/ShareModal.ts
var ShareModal_exports = {};
__export(ShareModal_exports, {
  ShareModal: () => ShareModal,
  mount: () => mount5
});
var import_qrcode_vendor = __toESM(require_qrcode_vendor());
var ShareModal = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "visible", signal(false));
    __publicField(this, "shareUrl", signal(""));
    __publicField(this, "qrDataUrl", signal(""));
  }
  init() {
    effect(() => {
      const state = shareModalState();
      this.visible.set(state.visible);
      if (state.visible) {
        this.shareUrl.set(state.url);
      } else {
        this.qrDataUrl.set("");
      }
    });
    effect(() => {
      this.el.classList.toggle("show", this.visible());
      if (this.visible()) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    });
    effect(() => {
      const input = this.el.querySelector("[data-share-url]");
      if (input) input.value = this.shareUrl();
    });
    effect(() => {
      const qrContainer = this.el.querySelector("[data-qr]");
      if (!qrContainer) return;
      if (!this.visible() || !this.shareUrl()) {
        qrContainer.innerHTML = "";
        return;
      }
      const dataUrl = this.getQrDataUrl(this.shareUrl());
      this.qrDataUrl.set(dataUrl);
      qrContainer.innerHTML = "";
      if (!dataUrl) {
        qrContainer.textContent = this.shareUrl();
        return;
      }
      const img = document.createElement("img");
      img.src = dataUrl;
      img.width = 240;
      img.height = 240;
      img.alt = "QR code for share link";
      img.loading = "eager";
      img.decoding = "async";
      img.onerror = () => {
        qrContainer.textContent = this.shareUrl();
      };
      qrContainer.appendChild(img);
    });
    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.hide();
    });
    this.el.querySelector("[data-action='close']")?.addEventListener("click", () => this.hide());
    this.el.querySelector("[data-action='copy']")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.shareUrl());
        const input = this.el.querySelector("[data-share-url]");
        if (input) {
          input.style.background = "#d1fae5";
          setTimeout(() => {
            input.style.background = "";
          }, 800);
        }
      } catch {
      }
    });
    this.el.querySelector("[data-action='native-share']")?.addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url: this.shareUrl() });
        } catch {
        }
      } else {
        try {
          await navigator.clipboard.writeText(this.shareUrl());
        } catch {
        }
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.visible()) this.hide();
    });
  }
  hide() {
    this.visible.set(false);
    this.qrDataUrl.set("");
    shareModalState.set({ url: "", visible: false });
  }
  getQrDataUrl(value) {
    try {
      const qr = (0, import_qrcode_vendor.default)(0, "M");
      qr.addData(value, "Byte");
      qr.make();
      return qr.createDataURL(6, 2);
    } catch {
      return "";
    }
  }
};
function mount5(el, ctx) {
  const inst = new ShareModal(el, ctx);
  inst.init();
  return inst;
}

// src/components/Toast/Toast.ts
var Toast_exports = {};
__export(Toast_exports, {
  Toast: () => Toast,
  mount: () => mount6
});

// src/lib/state/toast.state.ts
var toastData = signal({
  message: "",
  type: "info",
  visible: false
});
var hideTimeout = null;
var toast = {
  message: () => toastData().message,
  type: () => toastData().type,
  visible: () => toastData().visible,
  show(message, type = "info") {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    toastData.set({ message, type, visible: true });
    hideTimeout = setTimeout(() => {
      toastData.set({ ...toastData(), visible: false });
    }, 3e3);
  },
  hide() {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    toastData.set({ ...toastData(), visible: false });
  }
};

// src/components/Toast/Toast.ts
var Toast = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
  }
  init() {
    effect(() => {
      const msg = toast.message();
      const type = toast.type();
      const visible = toast.visible();
      this.el.classList.toggle("show", visible);
      this.el.classList.remove("success", "error", "info");
      this.el.classList.add(type);
      const iconEl = this.el.querySelector(".toast-icon");
      if (iconEl) {
        if (type === "success") {
          iconEl.textContent = "✓";
        } else if (type === "error") {
          iconEl.textContent = "✗";
        } else {
          iconEl.textContent = "ℹ";
        }
      }
      const msgEl = this.el.querySelector(".toast-message");
      if (msgEl) {
        msgEl.textContent = msg;
      }
    });
  }
};
function mount6(el, ctx) {
  const inst = new Toast(el, ctx);
  inst.init();
  return inst;
}

// src/components/UploadDropzone/UploadDropzone.ts
var UploadDropzone_exports = {};
__export(UploadDropzone_exports, {
  UploadDropzone: () => UploadDropzone,
  mount: () => mount7
});

// src/lib/state/upload.state.ts
var uploadDescriptor = signal(null);
function setUploadDescriptor(desc) {
  uploadDescriptor.set(desc);
}
function getUploadDescriptor() {
  return uploadDescriptor();
}
function clearUploadDescriptor() {
  uploadDescriptor.set(null);
}

// src/components/UploadDropzone/UploadDropzone.ts
var UploadDropzone = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "descriptor", signal(null));
    __publicField(this, "dropText", signal("Drop files or folders here"));
    __publicField(this, "fileInput", null);
    __publicField(this, "folderInput", null);
  }
  init() {
    this.fileInput = this.el.querySelector("[data-file-input]");
    this.folderInput = this.el.querySelector("[data-folder-input]");
    const dropTextEl = this.el.querySelector(".file-drop-text");
    const pickFilesBtn = this.el.querySelector("[data-pick-files]");
    const pickFolderBtn = this.el.querySelector("[data-pick-folder]");
    const displayNameInput = this.el.closest("form")?.querySelector("[data-display-name]");
    pickFilesBtn?.addEventListener("click", () => this.fileInput?.click());
    pickFolderBtn?.addEventListener("click", () => this.folderInput?.click());
    this.el.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.el.classList.add("dragover");
    });
    this.el.addEventListener("dragleave", () => {
      this.el.classList.remove("dragover");
    });
    this.el.addEventListener("drop", async (e) => {
      e.preventDefault();
      this.el.classList.remove("dragover");
      const entries = await this.extractDropEntries(e.dataTransfer);
      if (!entries.length) return;
      const desc = this.buildDescriptor(entries);
      this.descriptor.set(desc);
      setUploadDescriptor(desc);
      this.updateDisplay(desc);
      this.autoFillDisplayName(desc, displayNameInput);
      if (this.fileInput) this.fileInput.value = "";
      if (this.folderInput) this.folderInput.value = "";
    });
    this.fileInput?.addEventListener("change", (e) => {
      const target = e.target;
      if (target.files) {
        const desc = this.analyzeFiles(Array.from(target.files), false);
        this.descriptor.set(desc);
        setUploadDescriptor(desc);
        this.updateDisplay(desc);
        this.autoFillDisplayName(desc, displayNameInput);
        if (this.folderInput) this.folderInput.value = "";
      }
    });
    this.folderInput?.addEventListener("change", (e) => {
      const target = e.target;
      if (target.files) {
        const desc = this.analyzeFiles(Array.from(target.files), true);
        this.descriptor.set(desc);
        setUploadDescriptor(desc);
        this.updateDisplay(desc);
        this.autoFillDisplayName(desc, displayNameInput);
        if (this.fileInput) this.fileInput.value = "";
      }
    });
    effect(() => {
      const text = this.dropText();
      if (dropTextEl) dropTextEl.textContent = text;
    });
    effect(() => {
      const desc = this.descriptor();
      if (!desc || !desc.entries.length) {
        this.el.classList.remove("has-file");
      } else {
        this.el.classList.add("has-file");
      }
    });
    effect(() => {
      const shared = uploadDescriptor();
      if (!shared) {
        this.descriptor.set(null);
        this.updateDisplay(null);
        if (this.fileInput) this.fileInput.value = "";
        if (this.folderInput) this.folderInput.value = "";
      }
    });
  }
  getDescriptor() {
    return this.descriptor();
  }
  clear() {
    this.descriptor.set(null);
    clearUploadDescriptor();
    if (this.fileInput) this.fileInput.value = "";
    if (this.folderInput) this.folderInput.value = "";
  }
  autoFillDisplayName(desc, input) {
    if (!input) return;
    if (desc.type === "file" && desc.entries.length === 1) {
      input.value = desc.entries[0].file.name;
    } else if (desc.type === "folder" && desc.entries.length > 0) {
      const path = desc.entries[0].relativePath;
      if (path) {
        const folderName = path.split("/")[0];
        if (folderName) input.value = folderName;
      }
    } else {
      input.value = "";
    }
  }
  updateDisplay(desc) {
    if (!desc || !desc.entries.length) {
      this.dropText.set("Drop files or folders here");
      return;
    }
    if (desc.type === "folder") {
      this.dropText.set(`${desc.totalFiles} items from folder`);
    } else if (desc.totalFiles === 1) {
      this.dropText.set(desc.entries[0].file.name);
    } else {
      this.dropText.set(`${desc.totalFiles} files selected`);
    }
  }
  analyzeFiles(files, fromFolderInput) {
    const hasRelativePath = files.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));
    let type;
    if (files.length === 1 && !hasRelativePath) {
      type = "file";
    } else if (hasRelativePath || fromFolderInput) {
      type = "folder";
    } else {
      type = "files";
    }
    const entries = files.map((f) => ({
      file: f,
      size: f.size,
      relativePath: f.webkitRelativePath || null
    }));
    const totalSize = entries.reduce((s, e) => s + e.size, 0);
    return { type, totalFiles: entries.length, totalSize, entries };
  }
  buildDescriptor(entries) {
    const totalSize = entries.reduce((s, e) => s + e.size, 0);
    const hasRelativePath = entries.some((e) => e.relativePath && e.relativePath.includes("/"));
    let type;
    if (entries.length === 1 && !hasRelativePath) {
      type = "file";
    } else if (hasRelativePath) {
      type = "folder";
    } else {
      type = "files";
    }
    return { type, totalFiles: entries.length, totalSize, entries };
  }
  async extractDropEntries(dataTransfer) {
    if (!dataTransfer) return [];
    const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
    if (!items.length) {
      return Array.from(dataTransfer.files || []).map((f) => ({
        file: f,
        size: f.size,
        relativePath: f.webkitRelativePath || null
      }));
    }
    const entryPromises = items.filter((item) => item.kind === "file").map((item) => item.webkitGetAsEntry ? item.webkitGetAsEntry() : null).filter(Boolean).map((entry) => this.traverseEntry(entry, ""));
    const nested = await Promise.all(entryPromises);
    return nested.flat();
  }
  async traverseEntry(entry, prefix) {
    if (entry.file) {
      const fileEntry = entry;
      const file = await new Promise((resolve, reject) => fileEntry.file(resolve, reject));
      return [{ file, size: file.size, relativePath: prefix + file.name }];
    }
    if (entry.createReader) {
      const dirEntry = entry;
      const reader = dirEntry.createReader();
      const allChildren = await this.readAllEntries(reader);
      const allFiles = [];
      for (const child of allChildren) {
        const childFiles = await this.traverseEntry(child, `${prefix}${dirEntry.name}/`);
        allFiles.push(...childFiles);
      }
      return allFiles;
    }
    return [];
  }
  async readAllEntries(reader) {
    const entries = [];
    while (true) {
      const batch = await new Promise((resolve) => reader.readEntries(resolve));
      if (!batch.length) break;
      entries.push(...batch);
    }
    return entries;
  }
};
function mount7(el, ctx) {
  const inst = new UploadDropzone(el, ctx);
  inst.init();
  return inst;
}

// src/components/UploadForm/UploadForm.ts
var UploadForm_exports = {};
__export(UploadForm_exports, {
  UploadForm: () => UploadForm,
  mount: () => mount8
});

// src/lib/services/upload.service.ts
var UploadService = {
  async upload(descriptor, options = {}) {
    const formData = new FormData();
    if (options.parentId) {
      formData.append("parent_id", options.parentId);
    }
    formData.append("pin_code", options.pinCode || "");
    formData.append("contentType", descriptor.type);
    if ((descriptor.type === "file" || descriptor.type === "folder") && options.displayName) {
      formData.append("display_name", options.displayName.trim());
    }
    for (const entry of descriptor.entries) {
      formData.append("files", entry.file);
      if (entry.relativePath) {
        formData.append("paths", entry.relativePath);
      }
    }
    await http.post("/upload", formData, { json: false });
  }
};

// src/lib/services/folder.service.ts
var FolderService = {
  ROOT_ID: "00000000-0000-0000-0000-000000000000",
  async getContents(folderId, pin = "") {
    const isRoot = folderId === this.ROOT_ID;
    const endpoint = isRoot ? "/rootfilesandfolders" : `/folder/content/${folderId}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`;
    return http.get(endpoint);
  },
  async checkProtection(folderId) {
    try {
      const res = await http.get(`/folder/content/${folderId}`);
      return !!res?.is_protected;
    } catch {
      return false;
    }
  },
  async deleteFolder(folderId) {
    await http.delete(`/delete/folder/${folderId}`);
  }
};

// src/lib/state/folder-nav.state.ts
var FolderNavState = class {
  constructor() {
    __publicField(this, "currentFolderId", signal(FolderService.ROOT_ID));
    __publicField(this, "folderHistory", signal([]));
    __publicField(this, "folderPinCache", /* @__PURE__ */ new Map());
  }
  get ROOT_ID() {
    return FolderService.ROOT_ID;
  }
  setCurrentFolderID(folderId) {
    this.currentFolderId.set(folderId || this.ROOT_ID);
  }
  getCurrentFolderID() {
    return this.currentFolderId();
  }
  getFolderHistory() {
    return this.folderHistory();
  }
  cacheFolderPin(folderId, pin) {
    if (folderId && pin) {
      this.folderPinCache.set(folderId, pin);
    }
  }
  getCachedPin(folderId) {
    if (!folderId) return "";
    return this.folderPinCache.get(folderId) || "";
  }
  navigateToFolder(folderId, folderName, pin, loadFn) {
    this.folderHistory.set([
      ...this.folderHistory(),
      { id: this.currentFolderId(), name: folderName }
    ]);
    this.setCurrentFolderID(folderId);
    loadFn(folderId, pin);
  }
  navigateBack(loadFn) {
    const history = this.folderHistory();
    if (history.length > 0) {
      const newHistory = [...history];
      const previousFolder = newHistory.pop();
      this.folderHistory.set(newHistory);
      this.setCurrentFolderID(previousFolder.id);
      loadFn(previousFolder.id, "");
    } else {
      this.setCurrentFolderID(this.ROOT_ID);
      loadFn(this.ROOT_ID, "");
    }
  }
};
var folderNav = new FolderNavState();

// src/components/UploadForm/UploadForm.ts
var UploadForm = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "isUploading", signal(false));
  }
  init() {
    const form = this.el;
    const submitBtn = this.el.querySelector("[data-upload-submit]");
    const btnText = this.el.querySelector(".btn-text");
    const btnSpinner = this.el.querySelector(".btn-spinner");
    const displayNameInput = this.el.querySelector("[data-display-name]");
    const pinCodeInput = this.el.querySelector("[data-pin-code]");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const descriptor = getUploadDescriptor();
      if (!descriptor || !descriptor.entries.length) {
        toast.show("Please select files or a folder to upload", "error");
        return;
      }
      this.isUploading.set(true);
      if (btnText) btnText.style.display = "none";
      if (btnSpinner) btnSpinner.style.display = "inline-block";
      if (submitBtn) submitBtn.disabled = true;
      try {
        await UploadService.upload(descriptor, {
          displayName: displayNameInput?.value,
          pinCode: pinCodeInput?.value,
          parentId: folderNav.getCurrentFolderID() !== folderNav.ROOT_ID ? folderNav.getCurrentFolderID() : void 0
        });
        toast.show("Upload successful!", "success");
        clearUploadDescriptor();
        if (displayNameInput) displayNameInput.value = "";
        if (pinCodeInput) pinCodeInput.value = "";
        const event = new CustomEvent("upload:complete");
        this.el.dispatchEvent(event);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.show(message, "error");
      } finally {
        this.isUploading.set(false);
        if (btnText) btnText.style.display = "";
        if (btnSpinner) btnSpinner.style.display = "none";
        if (submitBtn) submitBtn.disabled = false;
      }
    });
    effect(() => {
      const uploading = this.isUploading();
      if (btnText) btnText.textContent = uploading ? "Uploading..." : "Upload File";
    });
  }
};
function mount8(el, ctx) {
  const inst = new UploadForm(el, ctx);
  inst.init();
  return inst;
}

// src/pages/index.ts
var pages_exports = {};
__export(pages_exports, {
  init: () => init2
});

// src/lib/services/file.service.ts
var FileService = {
  async deleteFile(fileId) {
    await http.delete(`/delete/file/${fileId}`);
  },
  downloadFile(fileId, pin = "") {
    const url = `${API_BASE}/download/${fileId}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`;
    triggerDownload(url);
  },
  downloadFolder(folderId, pin = "") {
    const url = `${API_BASE}/download-folder/${folderId}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`;
    triggerDownload(url);
  }
};

// src/pages/index.ts
function init2(el, ctx) {
  let pinModal = null;
  onMount(() => {
    pinModal = el.querySelector("[data-pin-modal]");
    const refreshBtn = el.querySelector("#refreshBtn");
    refreshBtn?.addEventListener("click", () => loadFiles());
    loadFiles();
  });
  onDestroy(() => {
    pinModal = null;
  });
  function showShareModal(url) {
    shareModalState.set({ url, visible: true });
  }
  async function loadFiles(folderId, pin = "") {
    const targetId = folderId || folderNav.getCurrentFolderID();
    folderNav.setCurrentFolderID(targetId);
    if (!pin && targetId) {
      const cached = folderNav.getCachedPin(targetId);
      if (cached) pin = cached;
    }
    const loadingEl = el.querySelector("#loadingState");
    const tableEl = el.querySelector("#fileTable");
    const emptyEl = el.querySelector("#emptyState");
    if (loadingEl) loadingEl.style.display = "flex";
    if (tableEl) tableEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "none";
    try {
      const data = await FolderService.getContents(targetId, pin);
      if (pin) folderNav.cacheFolderPin(targetId, pin);
      if (loadingEl) loadingEl.style.display = "none";
      const isRoot = targetId === FolderService.ROOT_ID;
      const allItems = [...data.folders || [], ...data.files || []];
      if (allItems.length === 0) {
        if (tableEl) tableEl.style.display = "none";
        if (!isRoot) {
          renderBackButton(tableEl);
        } else {
          if (emptyEl) emptyEl.style.display = "block";
        }
        return;
      }
      renderTable(data, isRoot, tableEl);
      if (tableEl) tableEl.style.display = "table";
    } catch {
      if (loadingEl) loadingEl.style.display = "none";
      toast.show("Failed to load files. Please try again.", "error");
    }
  }
  function renderTable(data, isRoot, tableEl) {
    if (!tableEl) return;
    const folders = data.folders || [];
    const files = data.files || [];
    let tbody = tableEl.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      tableEl.appendChild(tbody);
    }
    tbody.innerHTML = "";
    if (!isRoot && folderNav.getFolderHistory().length > 0) {
      const backRow = document.createElement("tr");
      backRow.className = "folder-row back-row";
      backRow.innerHTML = `<td colspan="4" style="cursor:pointer;font-weight:bold"><svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false" style="margin-right:0.5rem"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>Back to parent folder</td>`;
      backRow.addEventListener("click", () => navigateBack());
      tbody.appendChild(backRow);
    }
    folders.forEach((folder) => {
      const row = createFolderRow(folder);
      tbody.appendChild(row);
    });
    files.forEach((file) => {
      const row = createFileRow(file);
      tbody.appendChild(row);
    });
  }
  function createFolderRow(folder) {
    const row = document.createElement("tr");
    row.className = "folder-row";
    row.style.cursor = "pointer";
    const folderLink = `${API_BASE}/download-folder/${folder.id}`;
    row.innerHTML = `
      <td class="name-cell">
        <div class="name-stack">
          <svg width="1em" height="1em" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288c-10.1 0-19.6-4.7-25.6-12.8L243.2 57.6C231.1 41.5 212.1 32 192 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z"/></svg>
          <span class="name-text" title="${escapeHtml(folder.name)}">${escapeHtml(truncateName(folder.name))}</span>
        </div>
      </td>
      <td>${formatBytes(folder.size)}</td>
      <td>Folder</td>
      <td>
        <button class="btn-link share-btn" data-url="${folderLink}">Share</button>
        <button class="btn-link primary folder-download-btn" data-folder-id="${folder.id}">Download</button>
      </td>
    `;
    row.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showShareModal(folderLink);
    });
    row.querySelector(".folder-download-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleFolderDownload(folder.id, folder.isProtected);
    });
    row.addEventListener("click", (e) => {
      if (!e.target.closest(".btn-link")) {
        handleFolderNavigation(folder.id, folder.name, folder.isProtected);
      }
    });
    return row;
  }
  function createFileRow(file) {
    const row = document.createElement("tr");
    const downloadLink = `${API_BASE}/download/${file.id}`;
    row.innerHTML = `
      <td class="name-cell">
        <div class="name-stack">
          <svg width="1em" height="1em" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M320 464c8.8 0 16-7.2 16-16l0-288-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l256 0zM0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64z"/></svg>
          <span class="name-text" title="${escapeHtml(file.name)}">${escapeHtml(truncateName(file.name))}</span>
          <button class="copy-btn" title="Copy download link" data-copy="${downloadLink}">
            <svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M384 336l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L400 115.9 400 320c0 8.8-7.2 16-16 16zM192 384l192 0c35.3 0 64-28.7 64-64l0-204.1c0-12.7-5.1-24.9-14.1-33.9L366.1 14.1c-9-9-21.2-14.1-33.9-14.1L192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-32-48 0 0 32c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l32 0 0-48-32 0z"/></svg>
          </button>
        </div>
      </td>
      <td>${formatBytes(file.size)}</td>
      <td>${file.extension || "file"}</td>
      <td>
        <button class="btn-link share-btn" data-url="${downloadLink}">Share</button>
        <button class="btn-link primary download-btn" data-file-id="${file.id}">Download</button>
      </td>
    `;
    row.querySelector(".copy-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(downloadLink);
        toast.show("Link copied to clipboard", "success");
      } catch {
        toast.show("Failed to copy link", "error");
      }
    });
    row.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showShareModal(downloadLink);
    });
    row.querySelector(".download-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleFileDownload(file.id, file.isProtected);
    });
    return row;
  }
  function renderBackButton(tableEl) {
    if (!tableEl) return;
    let tbody = tableEl.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      tableEl.appendChild(tbody);
    }
    const backRow = document.createElement("tr");
    backRow.className = "folder-row back-row";
    backRow.style.cursor = "pointer";
    backRow.innerHTML = `<td colspan="4" style="font-weight:bold"><svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false" style="margin-right:0.5rem"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>Back to parent folder</td>`;
    backRow.addEventListener("click", () => navigateBack());
    tbody.appendChild(backRow);
  }
  function navigateBack() {
    folderNav.navigateBack((id, pin) => loadFiles(id, pin));
  }
  async function handleFolderNavigation(folderId, folderName, isProtected) {
    try {
      if (isProtected) {
        pinModal?.show(
          { type: "folder-open", id: folderId, name: folderName },
          (pin) => {
            folderNav.cacheFolderPin(folderId, pin);
            folderNav.navigateToFolder(folderId, folderName, pin, (id, p) => loadFiles(id, p));
            pinModal?.hide();
          }
        );
        return;
      }
      folderNav.navigateToFolder(folderId, folderName, "", (id, p) => loadFiles(id, p));
    } catch {
      toast.show("Failed to open folder", "error");
    }
  }
  function handleFileDownload(fileId, isProtected) {
    if (isProtected) {
      pinModal?.show(
        { type: "file", id: fileId },
        (pin) => {
          FileService.downloadFile(fileId, pin);
          pinModal?.hide();
        }
      );
      return;
    }
    FileService.downloadFile(fileId);
  }
  function handleFolderDownload(folderId, isProtected) {
    if (isProtected) {
      pinModal?.show(
        { type: "folder-download", id: folderId },
        (pin) => {
          FileService.downloadFolder(folderId, pin);
          pinModal?.hide();
        }
      );
      return;
    }
    FileService.downloadFolder(folderId);
  }
  function formatBytes(bytes) {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
  function truncateName(name, head = 6, tail = 4) {
    if (name.length <= head + tail + 3) return name;
    return `${name.slice(0, head)}...${name.slice(-tail)}`;
  }
  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}

// src/pages/config.ts
var config_exports = {};
__export(config_exports, {
  init: () => init3
});
function init3(el, ctx) {
  onMount(() => {
    console.log("[LocalDrop] Config page mounted");
  });
}

// src/pages/dashboard.ts
var dashboard_exports = {};
__export(dashboard_exports, {
  init: () => init4
});
function init4(el, ctx) {
  onMount(() => {
    const refreshBtn = el.querySelector("#refreshBtn");
    refreshBtn?.addEventListener("click", () => {
      const icon = refreshBtn.querySelector(".refresh-icon");
      if (icon) {
        refreshBtn.disabled = true;
        icon.style.animation = "spin 1s linear infinite";
        loadFiles();
        setTimeout(() => {
          refreshBtn.disabled = false;
          icon.style.animation = "";
        }, 500);
      } else {
        loadFiles();
      }
    });
    const uploadFormComponent = el.querySelector("[data-upload-form-component]");
    if (uploadFormComponent) {
      uploadFormComponent.el?.addEventListener("upload:complete", () => {
        loadFiles();
      });
    }
    loadFiles();
  });
  onDestroy(() => {
    deleteCallback.set(null);
    pinCallback.set(null);
  });
  function showDeleteModal(name, type, onConfirm) {
    deleteCallback.set(onConfirm);
    deleteModalState.set({ name, type, visible: true });
  }
  function showPinModal(action, onSubmit) {
    pinCallback.set(onSubmit);
    pinModalState.set({ action, visible: true });
  }
  function hidePinModal() {
    pinModalState.set({ action: null, visible: false });
    pinCallback.set(null);
  }
  function showShareModal(url) {
    shareModalState.set({ url, visible: true });
  }
  async function loadFiles(folderId, pin = "") {
    const targetId = folderId || folderNav.getCurrentFolderID();
    folderNav.setCurrentFolderID(targetId);
    if (!pin && targetId) {
      const cached = folderNav.getCachedPin(targetId);
      if (cached) pin = cached;
    }
    const loadingEl = el.querySelector("#loadingState");
    const tableEl = el.querySelector("#fileTable");
    const emptyEl = el.querySelector("#emptyState");
    if (loadingEl) loadingEl.style.display = "flex";
    if (tableEl) tableEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "none";
    try {
      const data = await FolderService.getContents(targetId, pin);
      if (pin) folderNav.cacheFolderPin(targetId, pin);
      if (loadingEl) loadingEl.style.display = "none";
      const isRoot = targetId === FolderService.ROOT_ID;
      const allItems = [...data.folders || [], ...data.files || []];
      if (allItems.length === 0) {
        if (tableEl) tableEl.style.display = "none";
        if (!isRoot) {
          renderBackButton(tableEl);
        } else {
          if (emptyEl) emptyEl.style.display = "block";
        }
        return;
      }
      renderTable(data, isRoot, tableEl);
      if (tableEl) tableEl.style.display = "table";
    } catch {
      if (loadingEl) loadingEl.style.display = "none";
      toast.show("Failed to load files. Please try again.", "error");
    }
  }
  function renderTable(data, isRoot, tableEl) {
    if (!tableEl) return;
    const folders = data.folders || [];
    const files = data.files || [];
    let tbody = tableEl.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      tableEl.appendChild(tbody);
    }
    tbody.innerHTML = "";
    if (!isRoot && folderNav.getFolderHistory().length > 0) {
      const backRow = document.createElement("tr");
      backRow.className = "folder-row back-row";
      backRow.innerHTML = `<td colspan="5" style="cursor:pointer;font-weight:bold"><svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false" style="margin-right:0.5rem"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>Back to parent folder</td>`;
      backRow.addEventListener("click", () => navigateBack());
      tbody.appendChild(backRow);
    }
    folders.forEach((folder) => {
      const row = createFolderRow(folder);
      tbody.appendChild(row);
    });
    files.forEach((file) => {
      const row = createFileRow(file);
      tbody.appendChild(row);
    });
  }
  function createFolderRow(folder) {
    const row = document.createElement("tr");
    row.className = "folder-row";
    row.style.cursor = "pointer";
    const folderLink = `${API_BASE}/download-folder/${folder.id}`;
    row.innerHTML = `
      <td class="name-cell">
        <div class="name-stack">
          <svg width="1em" height="1em" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288c-10.1 0-19.6-4.7-25.6-12.8L243.2 57.6C231.1 41.5 212.1 32 192 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z"/></svg>
          <span class="name-text" title="${escapeHtml(folder.name)}">${escapeHtml(truncateName(folder.name))}</span>
        </div>
      </td>
      <td>${formatBytes(folder.size)}</td>
      <td>Folder</td>
      <td>${new Date(folder.created_at).toLocaleDateString()}</td>
      <td>
        <button class="btn-link share-btn" data-url="${folderLink}">Share</button>
        <button class="btn-link primary folder-download-btn" data-folder-id="${folder.id}">Download</button>
        <button class="btn-link delete delete-folder-btn" data-folder-id="${folder.id}" data-folder-name="${escapeHtml(folder.name)}">Delete</button>
      </td>
    `;
    row.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showShareModal(folderLink);
    });
    row.querySelector(".folder-download-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleFolderDownload(folder.id, folder.isProtected);
    });
    row.querySelector(".delete-folder-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showDeleteModal(folder.name, "folder", () => {
        deleteFolder(folder.id, folder.name);
      });
    });
    row.addEventListener("click", (e) => {
      if (!e.target.closest(".btn-link")) {
        handleFolderNavigation(folder.id, folder.name, folder.isProtected);
      }
    });
    return row;
  }
  function createFileRow(file) {
    const row = document.createElement("tr");
    const downloadLink = `${API_BASE}/download/${file.id}`;
    row.innerHTML = `
      <td class="name-cell">
        <div class="name-stack">
          <svg width="1em" height="1em" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M320 464c8.8 0 16-7.2 16-16l0-288-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l256 0zM0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64z"/></svg>
          <span class="name-text" title="${escapeHtml(file.name)}">${escapeHtml(truncateName(file.name))}</span>
          <button class="copy-btn" title="Copy download link" data-copy="${downloadLink}">
            <svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M384 336l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L400 115.9 400 320c0 8.8-7.2 16-16 16zM192 384l192 0c35.3 0 64-28.7 64-64l0-204.1c0-12.7-5.1-24.9-14.1-33.9L366.1 14.1c-9-9-21.2-14.1-33.9-14.1L192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-32-48 0 0 32c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l32 0 0-48-32 0z"/></svg>
          </button>
        </div>
      </td>
      <td>${formatBytes(file.size)}</td>
      <td>${file.extension || "file"}</td>
      <td>${new Date(file.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn-link share-btn" data-url="${downloadLink}">Share</button>
        <button class="btn-link primary download-btn" data-file-id="${file.id}">Download</button>
        <button class="btn-link delete delete-file-btn" data-file-id="${file.id}" data-file-name="${escapeHtml(file.name)}">Delete</button>
      </td>
    `;
    row.querySelector(".copy-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(downloadLink);
        toast.show("Link copied to clipboard", "success");
      } catch {
        toast.show("Failed to copy link", "error");
      }
    });
    row.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showShareModal(downloadLink);
    });
    row.querySelector(".download-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleFileDownload(file.id, file.isProtected);
    });
    row.querySelector(".delete-file-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showDeleteModal(file.name, "file", () => {
        deleteFile(file.id, file.name);
      });
    });
    return row;
  }
  function renderBackButton(tableEl) {
    if (!tableEl) return;
    let tbody = tableEl.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      tableEl.appendChild(tbody);
    }
    const backRow = document.createElement("tr");
    backRow.className = "folder-row back-row";
    backRow.style.cursor = "pointer";
    backRow.innerHTML = `<td colspan="5" style="font-weight:bold"><svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false" style="margin-right:0.5rem"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>Back to parent folder</td>`;
    backRow.addEventListener("click", () => navigateBack());
    tbody.appendChild(backRow);
  }
  function navigateBack() {
    folderNav.navigateBack((id, pin) => loadFiles(id, pin));
  }
  async function handleFolderNavigation(folderId, folderName, isProtected) {
    try {
      if (isProtected) {
        showPinModal(
          { type: "folder-open", id: folderId, name: folderName },
          (pin) => {
            folderNav.cacheFolderPin(folderId, pin);
            folderNav.navigateToFolder(folderId, folderName, pin, (id, p) => loadFiles(id, p));
            hidePinModal();
          }
        );
        return;
      }
      folderNav.navigateToFolder(folderId, folderName, "", (id, p) => loadFiles(id, p));
    } catch {
      toast.show("Failed to open folder", "error");
    }
  }
  function handleFileDownload(fileId, isProtected) {
    if (isProtected) {
      showPinModal(
        { type: "file", id: fileId },
        (pin) => {
          FileService.downloadFile(fileId, pin);
          hidePinModal();
        }
      );
      return;
    }
    FileService.downloadFile(fileId);
  }
  function handleFolderDownload(folderId, isProtected) {
    if (isProtected) {
      showPinModal(
        { type: "folder-download", id: folderId },
        (pin) => {
          FileService.downloadFolder(folderId, pin);
          hidePinModal();
        }
      );
      return;
    }
    FileService.downloadFolder(folderId);
  }
  async function deleteFile(id, name) {
    try {
      await FileService.deleteFile(id);
      toast.show("File deleted", "success");
      loadFiles(folderNav.getCurrentFolderID());
    } catch {
      toast.show("Failed to delete file", "error");
    }
  }
  async function deleteFolder(id, name) {
    try {
      await FolderService.deleteFolder(id);
      toast.show("Folder deleted", "success");
      loadFiles(folderNav.getCurrentFolderID());
    } catch {
      toast.show("Failed to delete folder", "error");
    }
  }
  function formatBytes(bytes) {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
  function truncateName(name, head = 6, tail = 4) {
    if (name.length <= head + tail + 3) return name;
    return `${name.slice(0, head)}...${name.slice(-tail)}`;
  }
  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}

// src/pages/login.ts
var login_exports = {};
__export(login_exports, {
  init: () => init5
});
function init5(el, ctx) {
  const isLoading = signal(false);
  onMount(() => {
    const form = el.querySelector("[data-login-form]");
    const usernameInput = el.querySelector("[data-username]");
    const passwordInput = el.querySelector("[data-password]");
    const submitBtn = el.querySelector("[data-login-submit]");
    const btnText = el.querySelector(".btn-text");
    const btnSpinner = el.querySelector(".btn-spinner");
    const errorEl = el.querySelector("[data-error-msg]");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = usernameInput?.value.trim() || "";
      const password = passwordInput?.value.trim() || "";
      if (!username || !password) {
        showError("Please fill in all fields");
        return;
      }
      setLoading(true);
      try {
        const result = await AuthService.login(username, password);
        if (result.ok) {
          showSuccess("Login successful! Redirecting...");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1e3);
        } else {
          showError(result.error || "Login failed");
        }
      } catch {
        showError("Error connecting to server. Please try again.");
      } finally {
        setLoading(false);
      }
    });
    [usernameInput, passwordInput].forEach((input) => {
      input?.addEventListener("input", () => {
        if (errorEl?.classList.contains("show") && !errorEl.classList.contains("success")) {
          errorEl.classList.remove("show");
        }
      });
    });
    passwordInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        form?.dispatchEvent(new Event("submit"));
      }
    });
    function setLoading(loading) {
      isLoading.set(loading);
      if (submitBtn) submitBtn.disabled = loading;
      if (btnText) btnText.style.display = loading ? "none" : "";
      if (btnSpinner) btnSpinner.style.display = loading ? "inline-block" : "none";
    }
    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.remove("success");
      errorEl.classList.add("show");
      setTimeout(() => errorEl.classList.remove("show"), 5e3);
    }
    function showSuccess(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.add("success", "show");
    }
  });
}

// src/tinyfx.gen.ts
var __componentInstances = /* @__PURE__ */ new WeakMap();
function __registerInstance(el, instance) {
  __componentInstances.set(el, instance);
}
function mountComponent(module, el, ctx) {
  if (!markMounted(el)) return void 0;
  if (typeof module.mount === "function") {
    const inst = module.mount(el, ctx);
    if (inst && typeof inst === "object") {
      __registerInstance(el, inst);
    }
    return inst;
  }
  if (typeof module.init === "function") {
    module.init(el, ctx);
  }
  return void 0;
}
function __mount_ConfigForm(el, ctx) {
  const inst = mountComponent(ConfigForm_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_DeleteModal(el, ctx) {
  const inst = mountComponent(DeleteModal_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_Navbar(el, ctx) {
  const inst = mountComponent(Navbar_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_PinModal(el, ctx) {
  const inst = mountComponent(PinModal_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_ShareModal(el, ctx) {
  const inst = mountComponent(ShareModal_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_Toast(el, ctx) {
  const inst = mountComponent(Toast_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_UploadDropzone(el, ctx) {
  const inst = mountComponent(UploadDropzone_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_UploadForm(el, ctx) {
  const inst = mountComponent(UploadForm_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
registerComponent("ConfigForm", (el, ctx) => __mount_ConfigForm(el, ctx));
registerComponent("DeleteModal", (el, ctx) => __mount_DeleteModal(el, ctx));
registerComponent("Navbar", (el, ctx) => __mount_Navbar(el, ctx));
registerComponent("PinModal", (el, ctx) => __mount_PinModal(el, ctx));
registerComponent("ShareModal", (el, ctx) => __mount_ShareModal(el, ctx));
registerComponent("Toast", (el, ctx) => __mount_Toast(el, ctx));
registerComponent("UploadDropzone", (el, ctx) => __mount_UploadDropzone(el, ctx));
registerComponent("UploadForm", (el, ctx) => __mount_UploadForm(el, ctx));
var routes = {
  "/": { staticSegments: [], paramNames: [] },
  "/config": { staticSegments: ["config"], paramNames: [] },
  "/dashboard": { staticSegments: ["dashboard"], paramNames: [] },
  "/login": { staticSegments: ["login"], paramNames: [] }
};
registerPage("/", pages_exports);
registerPage("/config", config_exports);
registerPage("/dashboard", dashboard_exports);
registerPage("/login", login_exports);
function setupDirectives(ctx) {
}
if (typeof document !== "undefined") {
  const boot = () => {
    const ctx = init({ routes, setupDirectives });
    if (!ctx) return;
    document.querySelectorAll("[data-component='ConfigForm']").forEach((el) => {
      __mount_ConfigForm(el, ctx);
    });
    document.querySelectorAll("[data-component='DeleteModal']").forEach((el) => {
      __mount_DeleteModal(el, ctx);
    });
    document.querySelectorAll("[data-component='Navbar']").forEach((el) => {
      __mount_Navbar(el, ctx);
    });
    document.querySelectorAll("[data-component='PinModal']").forEach((el) => {
      __mount_PinModal(el, ctx);
    });
    document.querySelectorAll("[data-component='ShareModal']").forEach((el) => {
      __mount_ShareModal(el, ctx);
    });
    document.querySelectorAll("[data-component='Toast']").forEach((el) => {
      __mount_Toast(el, ctx);
    });
    document.querySelectorAll("[data-component='UploadDropzone']").forEach((el) => {
      __mount_UploadDropzone(el, ctx);
    });
    document.querySelectorAll("[data-component='UploadForm']").forEach((el) => {
      __mount_UploadForm(el, ctx);
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

// src/main.ts
SessionService.checkAuth();
init();
//# sourceMappingURL=main.js.map
