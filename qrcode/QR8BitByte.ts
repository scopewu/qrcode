import Mode from "./Mode";
import BitBuffer from "./BitBuffer";
import stringToBytes from "../text/stringToBytes_SJIS";
import QRData from "./QRData";

export default class QR8BitByte extends QRData {

  constructor(data : string) {
    super(Mode.MODE_8BIT_BYTE, data);
  }

  public write(buffer : BitBuffer) : void {
    const data = stringToBytes(this.getData());
    for (let i = 0; i < data.length; i += 1) {
      buffer.put(data[i], 8);
    }
  }

  public getLength() : number {
    return stringToBytes(this.getData() ).length;
  }
}
