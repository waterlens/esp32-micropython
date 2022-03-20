import * as vscode from "vscode";

export class Message {
  private static readonly extPrefix = "ESP32 MicroPython";
  private consoleLogPrefix: string;

  constructor(consoleLogPrefix: string) {
    this.consoleLogPrefix = consoleLogPrefix;
  }

  consoleLog(message: string) {
    console.log(this.stringWithConsoleLogPrefix(message));
  }

  showInfo(log: string, msg: string) {
    console.log(this.stringWithConsoleLogPrefix(log));
    vscode.window.showInformationMessage(this.messageWithExtName(msg));
  }

  showError(error: string, msg: string) {
    console.error(this.stringWithConsoleLogPrefix(error));
    vscode.window.showErrorMessage(this.messageWithExtName(msg));
  }

  showWarning(warning: string, msg: string) {
    console.warn(this.stringWithConsoleLogPrefix(warning));
    vscode.window.showWarningMessage(this.messageWithExtName(msg));
  }

  private messageWithExtName(message: string): string {
    return `${Message.extPrefix}: ${message}`;
  }

  private stringWithConsoleLogPrefix(message: string): string {
    return `${this.consoleLogPrefix}: ${message}`;
  }
}
