import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from 'vscode';
import { SerialPort } from "serialport";
import { EmpTerminal } from "./terminal";
import { openStdin } from "process";
// import { WebSocket } from "ws";
import * as WebSocket from 'ws';
import { time } from "console";

export enum DeviceType {
    webDevice,
    serialDevice,
}

export class DeviceId {
    deviceType: DeviceType;
    devicePath: string; 
    // password: string = "__invalid__";

    constructor(type: DeviceType, path: string) {
        this.devicePath = path;
        this.deviceType = type;
        // if (password) {
        //     this.password = password;
        // }
    }

    toString(): string {
        if (this.deviceType === DeviceType.serialDevice) {
            return "__serial__" + this.devicePath;
        } else {
            return "__web__" + this.devicePath;
        }
    }
}

export interface EmpDevice {
    onTerminalData: (data: string) => void;
    sendData(data: string): void;
    linkedTerminals: Array<EmpTerminal>;
    attachTerminal(terminal: EmpTerminal): void;
    detachTerminal(terminal: EmpTerminal): void;
    isConnected(): boolean;
}

export class SerialDevice implements EmpDevice {
    onTerminalData = (data: string) => {
        for (let i of this.linkedTerminals) {
            i.writeEmitter.fire(data);
        }
    }; 

    private serialPort: SerialPort;
    linkedTerminals = new Array();

    constructor(portPath: string) {
        // this.serialPort = serialPort;
        this.serialPort = new SerialPort({
            path: portPath,
            baudRate: 115200,
            hupcl: false,
        });

        this.serialPort.on("data", (data) => {
            this.onTerminalData(data.toString());
        });
        this.serialPort.on('close', () => {
            this.onTerminalData('Connection Expired');
        });
    }

    isConnected(): boolean {
        return this.serialPort.isOpen;
    }


    sendData(data: string): void {
        this.serialPort.write(data);
    }

    attachTerminal(terminal: EmpTerminal): void {
        console.log('adding terminal');
        this.linkedTerminals.push(terminal);
    }

    detachTerminal(terminal: EmpTerminal): void {
        for (let i = 0; i < this.linkedTerminals.length; i++) {
            if (this.linkedTerminals[i] === terminal) {
                this.linkedTerminals.splice(i, 1);
                break;
            }
        }
    }
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export class WebDevice implements EmpDevice {
    linkedTerminals: Array<EmpTerminal>;
    webSocket: WebSocket;
    binaryState = 0;
    connectStatus = false;

    onTerminalData = (data: string) => {
        for (let i of this.linkedTerminals) {
            i.writeEmitter.fire(data);
        }
    }; 

    constructor(devicePath: string, password: string) {

        this.linkedTerminals = new Array();
        this.webSocket = new WebSocket("ws://" + devicePath + ":8266");
        this.webSocket.binaryType = 'arraybuffer';
        this.webSocket.on('message', (data) => {
            this.onTerminalData(data.toString());
            console.log(data);
        }); 
        this.webSocket.on('open', () => {
            this.webSocket.send(password + '\r\n');

        });
        this.connectStatus = true;
        this.webSocket.on('close', () => {
            this.connectStatus = false;
            this.onTerminalData('Connection Expired.');
        });
    }

    sendData(data: string): void {
        this.webSocket.send(data);
    }

    isConnected(): boolean {
        // return true;
        return this.connectStatus;
    }


    attachTerminal(terminal: EmpTerminal): void {
        // console.log(this.getState());
        this.linkedTerminals.push(terminal);
    }

    detachTerminal(terminal: EmpTerminal): void {
        for (let i = 0; i < this.linkedTerminals.length; i++) {
            if (this.linkedTerminals[i] === terminal) {
                this.linkedTerminals.splice(i, 1);
                break;
            }
        }
        if (this.linkedTerminals.length === 0) {
            this.webSocket.close();
            this.connectStatus = false;
        }
    }

}

export class ConnectionHandler {
    private deviceMap: Map<string, EmpDevice> = new Map();
    // private countMap: Map<DeviceId, number> = new Map();

    constructor() {

    }

    peekDevice(deviceId: DeviceId): EmpDevice | undefined {
        return this.deviceMap.get(deviceId.toString());
    }

    async takeDevice(deviceId: DeviceId): Promise<EmpDevice> {
        let ret = this.peekDevice(deviceId);

        console.log(this.deviceMap.has(deviceId.toString()));
        if (ret === undefined || !ret.isConnected()) {
            if (deviceId.deviceType === DeviceType.serialDevice) {
                ret = new SerialDevice(deviceId.devicePath);
                this.deviceMap.set(deviceId.toString(), ret);
            } else {
                let password = await getPassword();
                let temp = new WebDevice(deviceId.devicePath, password);
                this.deviceMap.set(deviceId.toString(), temp);
                console.log(this.deviceMap.has(deviceId.toString()));
                ret = temp;
            }
        }
       return ret;
    }
}


async function getPassword(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let passwordBar = vscode.window.createInputBox();
        let ret: string;
        passwordBar.password = true;

        passwordBar.onDidChangeValue((val: string) => {
            ret = val;
        });

        passwordBar.onDidAccept(() => {
            passwordBar.dispose();
            resolve(ret);
        });

        passwordBar.show();

    });
}

export async function getIpAddr(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let ipBar = vscode.window.createInputBox();
        let ret: string;

        ipBar.onDidChangeValue((val: string) => {
            ret = val;
        });

        ipBar.onDidAccept(() => {
            ipBar.dispose();
            resolve(ret);
        });

        ipBar.show();

    });
}

class PortPickItem implements vscode.QuickPickItem{
	label: string;
	constructor(name: string) {
		this.label = name;
	}
}

export async function getSerialPort(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const quickPick = vscode.window.createQuickPick();
        const portList = SerialPort.list();
        portList.then((ports) => {
            quickPick.items = ports.map(port => new PortPickItem(port.path));
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.onDidChangeSelection(
            selection => {
                resolve(selection[0].label);
                quickPick.dispose();
            }
        );
        quickPick.show();
        });
}