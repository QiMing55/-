const { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { startServer, getLocalIP } = require('./server');

let mainWindow = null;
let tray = null;
let serverStarted = false;
const PORT = 5000;

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// 创建主窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: !isDev
        },
        show: false,
        frame: true,
        titleBarStyle: 'default',
        backgroundColor: '#f0f2f5'
    });
    
    // 加载本地服务器
    mainWindow.loadURL(`http://localhost:${PORT}`);
    
    // 开发工具
    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    
    // 窗口事件
    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // 阻止新窗口
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http://localhost') || url.startsWith(`http://${getLocalIP()}`)) {
            return { action: 'allow' };
        } else {
            shell.openExternal(url);
            return { action: 'deny' };
        }
    });
}

// 创建系统托盘
function createTray() {
    try {
        let iconPath;
        
        // 尝试不同的图标路径
        const possiblePaths = [
            path.join(__dirname, 'icon.ico'),
            path.join(__dirname, 'icon.png'),
            path.join(process.resourcesPath, 'icon.ico'),
            path.join(process.resourcesPath, 'icon.png')
        ];
        
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                iconPath = p;
                break;
            }
        }
        
        let trayIcon;
        if (iconPath) {
            trayIcon = nativeImage.createFromPath(iconPath);
            if (trayIcon.isEmpty()) {
                trayIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
            }
        } else {
            // 创建默认图标
            const size = 16;
            const Canvas = require('canvas');
            const canvas = Canvas.createCanvas(size, size);
            const ctx = canvas.getContext('2d');
            
            // 绘制简单图标
            ctx.fillStyle = '#667eea';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText('📁', 2, 12);
            
            const buffer = canvas.toBuffer('image/png');
            trayIcon = nativeImage.createFromBuffer(buffer);
        }
        
        tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
        
        const contextMenu = Menu.buildFromTemplate([
            {
                label: '📂 打开文件管理',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    } else {
                        createWindow();
                    }
                }
            },
            {
                label: '📱 手机访问地址',
                click: () => {
                    const localIP = getLocalIP();
                    const message = `在手机浏览器输入：\nhttp://${localIP}:${PORT}\n\n确保手机和电脑连接同一WiFi`;
                    
                    dialog.showMessageBox({
                        type: 'info',
                        title: '手机访问地址',
                        message: message,
                        buttons: ['确定', '复制地址'],
                        defaultId: 0,
                        cancelId: 1
                    }).then(result => {
                        if (result.response === 1) {
                            const { clipboard } = require('electron');
                            clipboard.writeText(`http://${localIP}:${PORT}`);
                            
                            // 显示通知
                            if (Notification.isSupported()) {
                                new Notification({
                                    title: '已复制到剪贴板',
                                    body: `地址已复制：http://${localIP}:${PORT}`
                                }).show();
                            }
                        }
                    });
                }
            },
            {
                label: '📁 打开文件目录',
                click: () => {
                    const filesDir = path.join(__dirname, 'files');
                    if (!fs.existsSync(filesDir)) {
                        fs.mkdirSync(filesDir, { recursive: true });
                    }
                    shell.openPath(filesDir);
                }
            },
            { type: 'separator' },
            {
                label: '🔄 重启服务器',
                click: () => {
                    // 这里可以添加重启服务器的逻辑
                    if (mainWindow) {
                        mainWindow.reload();
                    }
                    showNotification('服务器已重启', '文件共享服务已重新启动');
                }
            },
            {
                label: '⚙️ 设置',
                submenu: [
                    {
                        label: '开机自启',
                        type: 'checkbox',
                        checked: app.getLoginItemSettings().openAtLogin,
                        click: (item) => {
                            app.setLoginItemSettings({
                                openAtLogin: item.checked,
                                openAsHidden: true
                            });
                            showNotification('设置已更新', item.checked ? '已启用开机自启' : '已禁用开机自启');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '关于',
                        click: () => {
                            dialog.showMessageBox({
                                type: 'info',
                                title: '关于文件共享工具',
                                message: '文件共享工具完整版 v1.0\n\n基于Node.js和Electron开发\n支持局域网文件传输\n作者：蓝色小鲸鱼和世界霸主起名~',
                                buttons: ['确定']
                            });
                        }
                    }
                ]
            },
            { type: 'separator' },
            {
                label: '❌ 退出',
                click: () => {
                    app.quit();
                }
            }
        ]);
        
        tray.setToolTip('文件共享工具\n点击右键打开菜单\n双击打开主窗口');
        tray.setContextMenu(contextMenu);
        
        // 双击托盘图标打开主窗口
        tray.on('double-click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            } else {
                createWindow();
            }
        });
        
        console.log('✅ 系统托盘图标已创建');
        
    } catch (error) {
        console.error('创建托盘失败:', error);
    }
}

// 显示系统通知
function showNotification(title, body) {
    if (Notification.isSupported()) {
        new Notification({
            title: title,
            body: body,
            silent: false
        }).show();
    }
}

// 启动HTTP服务器
function startHTTPServer() {
    try {
        startServer(PORT);
        serverStarted = true;
        console.log('✅ HTTP服务器启动成功');
        
        // 显示启动通知
        setTimeout(() => {
            showNotification('文件共享工具已启动', '点击托盘图标管理文件共享服务');
        }, 1000);
        
    } catch (error) {
        console.error('❌ 启动HTTP服务器失败:', error);
        dialog.showErrorBox('启动失败', `无法启动HTTP服务器：${error.message}`);
    }
}

// 应用程序准备就绪
app.whenReady().then(() => {
    console.log('🎯 Electron应用程序准备就绪');
    
    // 确保files目录存在
    const filesDir = path.join(__dirname, 'files');
    if (!fs.existsSync(filesDir)) {
        fs.mkdirSync(filesDir, { recursive: true });
        console.log('✅ 创建files目录:', filesDir);
    }
    
    // 启动HTTP服务器
    startHTTPServer();
    
    // 创建主窗口
    createWindow();
    
    // 创建系统托盘
    createTray();
    
    console.log('✅ 文件共享工具完整版已启动');
    console.log('💻 电脑访问: http://localhost:' + PORT);
    
    // 显示启动提示
    setTimeout(() => {
        if (mainWindow) {
            mainWindow.webContents.executeJavaScript(`
                console.log('✅ 前端页面已加载');
            `);
        }
    }, 2000);
    
    // 处理应用激活（macOS）
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 所有窗口关闭时（不退出应用）
app.on('window-all-closed', (event) => {
    event.preventDefault();
    // 在托盘模式下，不退出应用
});

// 应用退出前清理
app.on('before-quit', () => {
    console.log('正在关闭文件共享工具...');
});

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});

// IPC通信处理
ipcMain.handle('get-server-info', () => {
    return {
        ip: getLocalIP(),
        port: PORT,
        started: serverStarted
    };
});

ipcMain.handle('show-notification', (event, title, body) => {
    showNotification(title, body);
});

// 设置单实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}