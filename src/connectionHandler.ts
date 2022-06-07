import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from 'vscode';
import { SerialPort } from "serialport";
import { EmpTerminal } from "./terminal";
import { openStdin } from "process";
// import { WebSocket } from "ws";
import * as WebSocket from 'ws';
import { time } from "console";
import { exec } from "child_process";
import { promisify } from "util";
import { setFlagsFromString } from "v8";
import EventEmitter from "events";
import { resolve } from "path";

export let serialGetFileDone = new vscode.EventEmitter<string>();
export let webGetFileDone = new vscode.EventEmitter<string>();
export let webBuffer: string[] = [];
export let serialBuffer: string[] = [];


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
    suspend(): void;
    waken(executeFile?: boolean): void;
    getFiles(path?: string): void;
    type(): DeviceType;
}

export class SerialDevice implements EmpDevice {
    onTerminalData = (data: string) => {
        for (let i of this.linkedTerminals) {
            i.writeEmitter.fire(data);
        }
    }; 

    type(): DeviceType {
        return DeviceType.serialDevice;
    }

    getFiles(path?: string): void {
        this.readingFile = true;
        this.readingBuffer = "";
        this.serialPort.write("import os\r\nos.listdir()\r\n");
    }

    private readingBuffer = "";
    private readingFile = false;

    waken(executeFile?: boolean): void {
        this.eliminateResetInfo = true;
        this.suspended = false;
        this.serialPort = new SerialPort({
            path: this.serialPort.path,
            baudRate: 115200,
            hupcl: false,
        });

        // this.serialPort.write("\r\nimport __tmp__\r\n");
        if (executeFile) {
            this.serialPort.write('\r\nexec(open("__tmp__").read())\r\n');
        }

        this.serialPort.on("data", (data) => {
            if (this.readingFile) {
                this.readingBuffer = this.readingBuffer.concat(data.toString());
                if (data.toString().includes("]")) {
                    // serialBuffer = this.readingBuffer.split(",")
                    //                               .slice(1)
                    //                               .filter(val => val.includes('\''))
                    //                               .map(val => {
                    //                                   return val.slice(2, val.length - 1);
                    //                               })
                    //                               .map(val => {
                    //                                   if (val.includes('\'')) {
                    //                                       return val.slice(0, val.indexOf("\'"));
                    //                                   } else {
                    //                                       return val;
                    //                                   }
                    //                               });
                    serialBuffer = rawToFileList(this.readingBuffer);
                    this.readingFile = false;
                    serialGetFileDone.fire("done");
                }
            }
            this.onTerminalData(data.toString());
        });

        this.serialPort.on('close', () => {
            if (this.suspended) {
                this.onTerminalData('\r\nStart Executing Local Script\r\n');
            } else {
                this.onTerminalData('\r\nConnection Expired\r\n');
            }
        });
    }

    private serialPort: SerialPort;
    linkedTerminals = new Array();
    private suspended: boolean = false;
    private eliminateResetInfo = false;

    suspend(): void {
        this.suspended = true;
        if (this.serialPort.isOpen) {
            this.serialPort.close(); 
        }
    }

    constructor(portPath: string) {
        this.suspended = false;
        this.serialPort = new SerialPort({
            path: portPath,
            baudRate: 115200,
            hupcl: false,
            // lock: false,
        });

        this.serialPort.on("data", (data) => {
            this.onTerminalData(data.toString());
            if (this.readingFile) {
                this.readingBuffer = this.readingBuffer.concat(data.toString());
                if (data.toString().includes("]")) {
                    // serialBuffer = this.readingBuffer.split(",")
                    //                             //   .slice(1)
                    //                               .filter(val => val.includes('\''))
                    //                               .map(val => {
                    //                                   return val.slice(2, val.length - 1);
                    //                               })
                    //                               .map(val => {
                    //                                   if (val.includes('\'')) {
                    //                                       return val.slice(0, val.indexOf("\'"));
                    //                                   } else {
                    //                                       return val;
                    //                                   }
                    //                               });
                    serialBuffer = rawToFileList(this.readingBuffer);
                    this.readingFile = false;
                    serialGetFileDone.fire("done");
                }
            }
        });
        this.serialPort.on('close', () => {
            if (this.suspended) {
                this.onTerminalData('\r\nStart Executing Local Script\r\n');
            } else {
                this.onTerminalData('\r\nConnection Expired\r\n');
            }
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
        if (this.linkedTerminals.length === 0) {
            this.serialPort.close();
        }
    }
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export class WebDevice implements EmpDevice {
    linkedTerminals: Array<EmpTerminal>;
    webSocket: WebSocket;
    connectStatus = false;
    readingFile = false;
    readingBuffer = "";
    private suspended = false;

    onTerminalData = (data: string) => {
        for (let i of this.linkedTerminals) {
            i.writeEmitter.fire(data);
        }
    }; 

    // this 'suspend' is used to select file, and transmit to webrepl server
    suspend(): void {
        // do nothing
        // redundant due to unreasonable interface design
        this.webSocket.close();
        this.suspended = true;
        // this.webSocket.close(); 
    }

    // wake and execute the transmitted file
    waken(executeFile?: boolean): void {
        this.suspended = false;
        // this.linkedTerminals = new Array();
        this.webSocket = new WebSocket("ws://" + this.devicePath + ":8266");
        this.webSocket.binaryType = 'arraybuffer';
        this.webSocket.on('message', (data) => {
            if (this.readingFile) {
                this.readingBuffer = this.readingBuffer.concat(data.toString());
                if (data.toString().includes("]")) {
                    // this.readingBuffer = this.readingBuffer.slice(this.readingBuffer.indexOf("["));
                    // webBuffer = this.readingBuffer.split(",")
                    //                             //   .slice(1)
                    //                               .filter(val => val.includes('\''))
                    //                               .map(val => {
                    //                                   return val.slice(2, val.length - 1);
                    //                               })
                    //                               .map(val => {
                    //                                   if (val.endsWith('\'')) {
                    //                                       return val.slice(0, val.length - 1);
                    //                                   } else {
                    //                                       return val;
                    //                                   }
                    //                               });
                    webBuffer = rawToFileList(this.readingBuffer)
                    this.readingFile = false;
                    webGetFileDone.fire("done");
                }
            }
            this.onTerminalData(data.toString());
            console.log(data);
        }); 
        this.webSocket.on('open', () => {
            this.webSocket.send(this.password + '\r\n');
            if (executeFile) {
                this.webSocket.send('\r\nexec(open("__tmp__").read())\r\n');
            }
        });
        this.connectStatus = true;
        this.webSocket.on('close', () => {
            this.connectStatus = false;
            this.onTerminalData('Connection Expired.');
        });
    }

    constructor(private devicePath: string, private password: string) {

        this.linkedTerminals = new Array();
        this.webSocket = new WebSocket("ws://" + devicePath + ":8266");
        this.webSocket.binaryType = 'arraybuffer';
        this.webSocket.on('message', (data) => {
            this.onTerminalData(data.toString());
            if (this.readingFile) {
                this.readingBuffer = this.readingBuffer.concat(data.toString());
                if (data.toString().includes("]")) {
                    // webBuffer = this.readingBuffer.split(",");
                    // this.readingBuffer = this.readingBuffer.slice(this.readingBuffer.indexOf("["))
                    // webBuffer = this.readingBuffer.split(",")
                    //                               .slice(1)
                    //                               .filter(val => val.includes('\''))
                    //                               .map(val => {
                    //                                   return val.slice(2, val.length - 1);
                    //                               })
                    //                               .map(val => {
                    //                                   if (val.endsWith('\'')) {
                    //                                       return val.slice(0, val.length - 1);
                    //                                   } else {
                    //                                       return val;
                    //                                   }
                    //                               });
                    webBuffer = rawToFileList(this.readingBuffer)
                    this.readingFile = false;
                    webGetFileDone.fire("done");
                }
            }
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

    getFiles(path?: string): void {
        this.readingBuffer = "";
        webBuffer = [];
        this.readingFile = true;
        this.webSocket.send("import os\r\nos.listdir()\r\n");
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

    type(): DeviceType {
        return DeviceType.webDevice;
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

let ipMemory: string[] = [];
let passWordMemory: Map<string, string> = new Map();

export async function getPassword(ip?: string): Promise<string> {
    if (ip !== undefined) {
        let passwd = passWordMemory.get(ip);
        if (passwd) {
            // return resolve("****" + passwd + "****");
            return new Promise<string>((resolve, _) => {
                let ret = "";
                if (passwd) {
                    ret = passwd;
                }
                resolve(ret);
            });
        }
    }
    return new Promise<string>((resolve, reject) => {
        let passwordBar = vscode.window.createInputBox();
        let ret: string;
        passwordBar.password = true;

        let foundPasswd = passWordMemory.get(ipMemory[ipMemory.length - 1]);
        if (foundPasswd) {
            ret = foundPasswd;
            passwordBar.value = foundPasswd;
        }

        passwordBar.onDidChangeValue((val: string) => {
            passWordMemory = new Map();
            ret = val;
        });

        passwordBar.onDidAccept(() => {
            passwordBar.dispose();
            resolve(ret);
            passWordMemory.set(ipMemory[ipMemory.length - 1], ret);
        });

        passwordBar.show();

    });
}

export async function getIpAddr(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let ipBar = vscode.window.createInputBox();
        let ret: string;
        
        if (ipMemory.length > 0) {
            ipBar.value = ipMemory[ipMemory.length - 1];
            ret = ipBar.value;
        }

        ipBar.onDidChangeValue((val: string) => {
            ret = val;
        });

        ipBar.onDidAccept(() => {
            ipBar.dispose();
            resolve(ret);
            ipMemory.push(ret);
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

function rawToFileList(raw: string) : string[] {
    console.log("the raw string is ***" + raw + "***");
    let pos1 = raw.indexOf('[');
    let pos2 = raw.indexOf(']');
    console.log(pos1);
    console.log(pos2);
    raw = raw.slice(pos1 + 1,pos2);
    console.log("***" + raw + "***");
    let ret = raw.split(',').map((val) => {
        val = val.trim();
        return val.slice(1, val.length - 1);
    }).filter((val) => {
        return val.indexOf('.') != -1;
    })
    console.log(ret);
    return ret;
}