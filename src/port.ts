import { SerialPort } from "serialport";

export class PortUtil {
  static listAsStringArray() {
    return SerialPort.list().then((ports) =>
      ports.filter((port) => port.pnpId !== undefined).map((port) => port.path)
    );
  }
}
