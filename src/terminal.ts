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

export class TerminalWrapper {
	connectionHandler = new ConnectionHandler();

	async createSerialTerminal() {
		let serialPortNumber = await getSerialPort();
		console.log(serialPortNumber);
		let deviceId = new DeviceId(DeviceType.serialDevice, serialPortNumber);
		let device = await this.connectionHandler.takeDevice(deviceId);
		// let terminal = terminalHandler.getTerminal(deviceId, device);
		let terminal = vscode.window.createTerminal({
					name: "Serial: " + deviceId.devicePath,
					pty: new EmpTerminal(device),
		});
		terminal.show();
	}	
	async createWebTerminal() {
      let ipAddr = await getIpAddr();
      let deviceId = new DeviceId(DeviceType.webDevice, ipAddr);
      console.log(ipAddr);
      let device = await this.connectionHandler.takeDevice(deviceId);
      // let terminal = terminalHandler.getTerminal(deviceId, device);
      let terminal = vscode.window.createTerminal({
				name: "ws://" + deviceId.devicePath + ":8266",
				pty: new EmpTerminal(device),
      });
      terminal.show();
    }
}