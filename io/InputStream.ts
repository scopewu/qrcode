export default abstract class InputStream {
  constructor() {}
  public abstract readByte() : number;
  public close() : void {
  }
}
