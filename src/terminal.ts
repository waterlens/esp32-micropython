import { SerialPort } from "serialport";
import { DeviceId, DeviceType, EmpDevice } from "./connectionHandler";
import * as vscode from 'vscode';
import { WebTerminal } from "./webTerminal";
import { getIpAddr, getSerialPort, ConnectionHandler } from "./connectionHandler";

export function showAvailablePorts() {
  const portList = SerialPort.list();
  portList.then((ports) => console.log(ports));
}

export class EmpTerminal implements vscode.Pseudoterminal {
	writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;

	closeEmitter = new vscode.EventEmitter<number>();
	onDidClose?: vscode.Event<number> = this.closeEmitter.event;

	private device: EmpDevice;

	handleInput(data: string): void {
		this.device.sendData(data);
	}

	constructor(device: EmpDevice) {
		this.device = device;
		device.attachTerminal(this);
		}

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {

	}

	close(): void {
		this.device.detachTerminal(this);
	}
}

// export class TerminalHandler {
// 	terminalMap: Map<DeviceId, vscode.Terminal> = new Map();
// 	constructor() {}
// 	getTerminal(deviceId: DeviceId, empDevice: EmpDevice): vscode.Terminal {
// 		if (this.terminalMap.has(deviceId)) {
// 			// let res = this.terminalMap.get(deviceId);
// 			// if (res) {
// 			// 	return res;
// 			// } else {
// 			// 	throw new ReferenceError('Device is not connected');
// 			// }
// 		} else {
// 			this.terminalMap.set(deviceId, vscode.window.createTerminal({
// 				name: deviceId.deviceType === DeviceType.serialDevice ? "Serial: " + deviceId.devicePath : "ws://" + deviceId.devicePath + ":8266",
// 				pty: new EmpTerminal(empDevice),
// 			}));
// 		}
// 		let res = this.terminalMap.get(deviceId);
// 		if (res) {
// 			return res;
// 		} else {
// 			throw new ReferenceError('Device is not connected');
// 		}
// 	}
// }