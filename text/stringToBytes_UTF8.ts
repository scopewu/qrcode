export default function stringToBytes_UTF8(s : string) : number[] {
  // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
  function toUTF8Array(str : string) : number[] {
    const utf8: number[] = [];
    for (let i=0; i < str.length; i++) {
      let charCode = str.charCodeAt(i);
      if (charCode < 0x80) utf8.push(charCode);
      else if (charCode < 0x800) {
        utf8.push(0xc0 | (charCode >> 6),
          0x80 | (charCode & 0x3f));
      }
      else if (charCode < 0xd800 || charCode >= 0xe000) {
        utf8.push(0xe0 | (charCode >> 12),
          0x80 | ((charCode>>6) & 0x3f),
          0x80 | (charCode & 0x3f));
      }
      // surrogate pair
      else {
        i++;
        // UTF-16 encodes 0x10000-0x10FFFF by
        // subtracting 0x10000 and splitting the
        // 20 bits of 0x0-0xFFFFF into two halves
        charCode = 0x10000 + (((charCode & 0x3ff)<<10)
          | (str.charCodeAt(i) & 0x3ff));
        utf8.push(0xf0 | (charCode >>18),
          0x80 | ((charCode>>12) & 0x3f),
          0x80 | ((charCode>>6) & 0x3f),
          0x80 | (charCode & 0x3f));
      }
    }
    return utf8;
  }
  return toUTF8Array(s);
}
