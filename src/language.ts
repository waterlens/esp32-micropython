import * as vscode from "vscode";
const path = require('path');

export class LanguageSupport {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    registerAllCommands() {
        // paths are relative to the "assets" directory
        const extensionBase = this.context.extensionPath;
        const relaBase = "assets/stubs";
        const stubsPre = [
            "cpython_core-micropython",
            "micropython-v1_18-frozen/esp32/RELEASE",
            "micropython-v1_18-docstubs",
            "micropython-v1_18-esp32"
        ];
        let stubs : string[] = stubsPre.map(s => path.join(extensionBase, relaBase, s));
        let enableStubs = vscode.commands.registerCommand('emp.language.enable', () => {
            const config = vscode.workspace.getConfiguration('');
            const configName = 'python.analysis.extraPaths';
            let tmp = config.inspect<string[]>(configName);
            if (tmp === undefined) {
                vscode.window.showErrorMessage(`Micropython Language Support: cannot get config ${configName}`);
            } else {
                let before: string[] = (tmp.globalValue === undefined) ? [] : tmp.globalValue;
                let after = stubs.concat(before.filter(s => !stubs.includes(s)));
                config.update(configName, after, true);
            }
        });
        let disableStubs = vscode.commands.registerCommand('emp.language.disable', () => {
            const config = vscode.workspace.getConfiguration('');
            const configName = 'python.analysis.extraPaths';
            let tmp = config.inspect<string[]>(configName);
            if (tmp === undefined) {
                vscode.window.showErrorMessage(`Micropython Language Support: cannot get config ${configName}`);
            } else {
                let before: string[] = (tmp.globalValue === undefined) ? [] : tmp.globalValue;
                let after = before.filter(s => !stubs.includes(s));
                config.update(configName, after, true);
            }
        });

        return [enableStubs, disableStubs];
    }

    register() {
        for (const cmd of this.registerAllCommands()) {
            this.context.subscriptions.push(cmd);
        }
    }
}