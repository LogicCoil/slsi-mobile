const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        backgroundColor: '#0A0B0E'
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// 1. SMART APP, WEBSITE & PROFILE LAUNCHER HANDLER
// ==========================================
ipcMain.handle('open-app', async (event, input) => {
    return new Promise((resolve) => {
        const lower = (input || '').toLowerCase().trim();
        const useChrome = lower.includes('in chrome') || lower.includes('chrome');

        let targetUrl = null;

        // 1. Check for profile requests (e.g., "open logiccoil's profile in github in chrome")
        if (lower.includes('profile') || lower.includes("'s") || lower.includes('on github') || lower.includes('in github')) {
            let cleaned = lower
                .replace(/open\s+/i, '')
                .replace(/in chrome|chrome/gi, '')
                .replace(/profile/gi, '')
                .replace(/'s|s\b/gi, '')
                .trim();

            let platform = 'github';
            if (cleaned.includes('youtube')) platform = 'youtube';
            else if (cleaned.includes('twitter') || cleaned.includes(' x ')) platform = 'twitter';
            else if (cleaned.includes('instagram')) platform = 'instagram';

            let username = cleaned
                .replace(/in github|on github|github/gi, '')
                .replace(/in youtube|on youtube|youtube/gi, '')
                .replace(/in twitter|on twitter|twitter/gi, '')
                .replace(/in instagram|on instagram|instagram/gi, '')
                .replace(/\b(in|on|at|for)\b/gi, '')
                .trim();

            if (username) {
                if (platform === 'github') {
                    targetUrl = `https://github.com/${username}`;
                } else if (platform === 'youtube') {
                    targetUrl = `https://www.youtube.com/@${username}`;
                } else if (platform === 'twitter') {
                    targetUrl = `https://x.com/${username}`;
                } else if (platform === 'instagram') {
                    targetUrl = `https://www.instagram.com/${username}`;
                }
            }
        }

        // 2. Standard Website Keyword Mapping Fallback
        if (!targetUrl) {
            const siteMap = {
                'github': 'https://www.github.com',
                'youtube': 'https://www.youtube.com',
                'google': 'https://www.google.com',
                'facebook': 'https://www.facebook.com',
                'instagram': 'https://www.instagram.com',
                'twitter': 'https://www.twitter.com',
                'x': 'https://www.x.com',
                'reddit': 'https://www.reddit.com',
                'chatgpt': 'https://chat.openai.com',
                'discord': 'https://discord.com'
            };

            for (const [siteKey, url] of Object.entries(siteMap)) {
                if (lower.includes(siteKey)) {
                    targetUrl = url;
                    break;
                }
            }
        }

        // 3. Direct Domain Fallback
        if (!targetUrl && (lower.includes('.com') || lower.includes('.org') || lower.includes('.net') || lower.includes('.io'))) {
            let cleanDomain = lower.replace(/open|in chrome|chrome|and type|search|profile/gi, '').trim();
            targetUrl = cleanDomain.startsWith('http') ? cleanDomain : `https://${cleanDomain}`;
        }

        // 4. Launch URL
        if (targetUrl) {
            if (useChrome) {
                exec(`start chrome "${targetUrl}"`, (err) => {
                    if (err) {
                        shell.openExternal(targetUrl).then(() => {
                            resolve({ success: true, output: `Opened ${targetUrl} (Default Browser fallback)` });
                        }).catch((openErr) => {
                            resolve({ success: false, output: `Failed to open site: ${openErr.message}` });
                        });
                    } else {
                        resolve({ success: true, output: `Opened ${targetUrl} in Google Chrome!` });
                    }
                });
            } else {
                shell.openExternal(targetUrl).then(() => {
                    resolve({ success: true, output: `Opened ${targetUrl} in default browser!` });
                }).catch((err) => {
                    resolve({ success: false, output: `Failed to open site: ${err.message}` });
                });
            }
            return;
        }

        // 5. Standard Desktop App Launching Fallback
        const cleanAppName = lower.replace(/^open\s+/i, '').trim();
        exec(`start "" "${cleanAppName}"`, (error) => {
            if (error) {
                resolve({ success: false, output: `Could not launch ${cleanAppName}.` });
            } else {
                resolve({ success: true, output: `Successfully launched ${cleanAppName}!` });
            }
        });
    });
});

// ==========================================
// 2. NOTEPAD AUTOMATION & CODE INJECTION
// ==========================================
ipcMain.handle('open-notepad-and-type', async (event, codeText) => {
    return new Promise((resolve) => {
        try {
            const filePath = path.join(app.getPath('temp'), 'slsi_temp_code.txt');
            fs.writeFileSync(filePath, codeText || '', 'utf-8');

            exec(`start notepad.exe "${filePath}"`, (error) => {
                if (error) {
                    resolve({ success: false, output: 'Failed to open Notepad.' });
                } else {
                    resolve({ success: true, output: 'Notepad opened successfully!' });
                }
            });
        } catch (e) {
            resolve({ success: false, output: `Error: ${e.message}` });
        }
    });
});

// ==========================================
// 3. TERMINAL & ADMIN EXECUTION HANDLER
// ==========================================
ipcMain.handle('run-terminal', async (event, command) => {
    const lowerCmd = (command || '').toLowerCase();
    
    if (lowerCmd.includes('as admin') || lowerCmd.includes('administrator') || lowerCmd.includes('admin')) {
        return new Promise((resolve) => {
            let isPowerShell = lowerCmd.includes('powershell');

            if (isPowerShell) {
                exec('powershell Start-Process powershell -Verb RunAs', (error) => {
                    if (error) {
                        resolve({ success: false, output: `Elevation error: ${error.message}` });
                    } else {
                        resolve({ success: true, output: 'Opened Administrator PowerShell prompt successfully!' });
                    }
                });
                return;
            }

            let scriptContent = '@echo off\n';
            if (lowerCmd.includes('wifi')) {
                scriptContent += 
                    'echo [*] Scanning Wi-Fi interfaces and network profiles...\n' +
                    'netsh wlan show interfaces\n' +
                    'echo ---------------------------------------------------\n' +
                    'netsh wlan show profiles\n' +
                    'echo ---------------------------------------------------\n' +
                    'echo [!] Diagnostic complete. Press any key to close.\n' +
                    'pause\n';
            } else if (lowerCmd.includes('echo') && lowerCmd.includes('pause')) {
                scriptContent += 'echo 123456\npause\n';
            } else {
                scriptContent += 'echo S.L.S.I. Admin Prompt Active\npause\n';
            }

            const scriptPath = path.join(app.getPath('temp'), 'slsi_run.bat');
            try {
                fs.writeFileSync(scriptPath, scriptContent, 'utf-8');
            } catch (err) {
                resolve({ success: false, output: `File write error: ${err.message}` });
                return;
            }

            const execStr = `powershell Start-Process cmd -ArgumentList '/k "${scriptPath}"' -Verb RunAs`;
            exec(execStr, (error) => {
                if (error) {
                    resolve({ success: false, output: `Elevation error: ${error.message}` });
                } else {
                    resolve({ success: true, output: 'Opened Administrative Command Prompt successfully!' });
                }
            });
        });
    } else {
        return new Promise((resolve) => {
            exec(command, { encoding: 'buffer' }, (error, stdout, stderr) => {
                let output = '';
                try {
                    output = stdout ? stdout.toString('utf8') : '';
                    if (stderr) output += '\n' + stderr.toString('utf8');
                } catch {
                    output = 'Command executed.';
                }

                if (error && !output) {
                    resolve({ success: false, output: error.message });
                } else {
                    resolve({ success: true, output: output || 'Command executed successfully.' });
                }
            });
        });
    }
});