// 超简单文件共享服务器 - 纯Node.js实现
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

// 配置
const PORT = 5000;
const FILES_DIR = path.join(__dirname, 'files');

// 确保files目录存在
if (!fs.existsSync(FILES_DIR)) {
    fs.mkdirSync(FILES_DIR, { recursive: true });
}

// 格式化文件大小
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// 获取本地IP地址
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// 生成HTML页面
function generateHTML(files) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>📁 文件共享工具By QiMing55</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 900px;
            margin: 0 auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .stats {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 20px;
            border: 1px solid #e9ecef;
        }
        
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 10px;
            padding: 40px 20px;
            text-align: center;
            margin: 20px 0;
            background: #f8f9ff;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .upload-area:hover {
            border-color: #764ba2;
            background: #f0f2ff;
        }
        
        .upload-area.dragging {
            border-color: #28a745;
            background: #e8f7ee;
        }
        
        .upload-icon {
            font-size: 48px;
            margin-bottom: 15px;
            display: block;
        }
        
        .upload-text {
            font-size: 18px;
            color: #333;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .upload-hint {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .file-list {
            margin-top: 30px;
        }
        
        .file-item {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.2s;
        }
        
        .file-item:hover {
            background: #f9f9f9;
        }
        
        .download-btn {
            background: #28a745;
            color: white;
            padding: 6px 15px;
            text-decoration: none;
            border-radius: 5px;
            font-size: 14px;
            transition: all 0.3s;
        }
        
        .download-btn:hover {
            background: #218838;
            transform: translateY(-1px);
            box-shadow: 0 3px 6px rgba(0,0,0,0.1);
        }
        
        .progress-bar {
            width: 0%;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 2px;
            margin-top: 15px;
            transition: width 0.3s;
        }
        
        .status {
            margin-top: 10px;
            font-size: 14px;
            min-height: 20px;
        }
        
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .info { color: #007bff; }
        
        .file-input {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            opacity: 0;
            cursor: pointer;
        }
        
        @media (max-width: 768px) {
            body { padding: 15px; }
            .container { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📁 文件共享工具By QiMing55</h1>
        
        <div class="stats">
            <p>服务器运行中！共有 <strong id="fileCount">${files.length}</strong> 个文件</p>
            <p>📱 手机访问：<code>http://${getLocalIP()}:${PORT}</code></p>
            <p>💡 提示：拖拽文件到下方区域上传</p>
        </div>
        
        <div class="upload-area" id="uploadArea">
            <div class="upload-icon">📤</div>
            <div class="upload-text">拖拽文件到此处上传</div>
            <div class="upload-hint">支持所有类型文件</div>
            <div class="upload-hint">或点击此处选择文件</div>
            <input type="file" id="fileInput" class="file-input" multiple>
            <div class="progress-bar" id="progressBar"></div>
            <div class="status" id="status"></div>
        </div>
        
        <div class="file-list">
            <h3 style="color: #333; margin-bottom: 15px;">📋 文件列表</h3>
            <div id="fileList">
                ${files.map(file => `
                <div class="file-item">
                    <span>📄 ${file.name} (${file.size})</span>
                    <a href="/download/${encodeURIComponent(file.name)}" class="download-btn">下载</a>
                </div>
                `).join('')}
            </div>
        </div>
    </div>

    <script>
        // 获取DOM元素
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const progressBar = document.getElementById('progressBar');
        const status = document.getElementById('status');
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');
        
        // 阻止页面默认拖拽行为
        document.addEventListener('dragover', e => e.preventDefault());
        document.addEventListener('drop', e => e.preventDefault());
        
        // 拖拽上传
        uploadArea.addEventListener('dragover', e => {
            e.preventDefault();
            uploadArea.classList.add('dragging');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragging');
        });
        
        uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            uploadArea.classList.remove('dragging');
            
            if (e.dataTransfer.files.length > 0) {
                uploadFiles(e.dataTransfer.files);
            }
        });
        
        // 点击上传
        uploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                uploadFiles(this.files);
                this.value = '';
            }
        });
        
        // 上传文件
        function uploadFiles(files) {
            const totalFiles = files.length;
            let uploaded = 0;
            
            status.textContent = \`准备上传 \${totalFiles} 个文件...\`;
            status.className = 'status info';
            progressBar.style.width = '0%';
            
            Array.from(files).forEach((file, index) => {
                const formData = new FormData();
                formData.append('file', file);
                
                status.textContent = \`正在上传: \${file.name} (\${index + 1}/\${totalFiles})\`;
                
                // 模拟进度
                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * 10;
                    if (progress > 70) {
                        clearInterval(interval);
                        progress = 70;
                    }
                    progressBar.style.width = progress + '%';
                }, 200);
                
                fetch('/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    clearInterval(interval);
                    
                    if (data.success) {
                        uploaded++;
                        progressBar.style.width = (uploaded / totalFiles * 100) + '%';
                        
                        if (uploaded === totalFiles) {
                            status.textContent = \`✅ 所有文件上传完成！\`;
                            status.className = 'status success';
                            progressBar.style.width = '100%';
                            
                            setTimeout(() => {
                                location.reload();
                            }, 1500);
                        }
                    } else {
                        status.textContent = \`❌ 上传失败: \${data.error}\`;
                        status.className = 'status error';
                    }
                })
                .catch(error => {
                    clearInterval(interval);
                    status.textContent = \`❌ 上传失败: \${error.message}\`;
                    status.className = 'status error';
                });
            });
        }
        
        // 定期刷新文件列表
        setInterval(() => {
            fetch('/list')
                .then(response => response.json())
                .then(files => {
                    fileCount.textContent = files.length;
                    fileList.innerHTML = files.map(file => \`
                        <div class="file-item">
                            <span>📄 \${file.name} (\${file.size})</span>
                            <a href="/download/\${encodeURIComponent(file.name)}" class="download-btn">下载</a>
                        </div>
                    \`).join('');
                });
        }, 5000); // 每5秒刷新一次
    </script>
</body>
</html>`;
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理预检请求
    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // 主页
    if (method === 'GET' && parsedUrl.pathname === '/') {
        fs.readdir(FILES_DIR, (err, files) => {
            if (err) {
                res.writeHead(500);
                res.end('读取文件列表失败');
                return;
            }
            
            const fileList = files
                .filter(file => {
                    try {
                        return fs.statSync(path.join(FILES_DIR, file)).isFile();
                    } catch {
                        return false;
                    }
                })
                .map(file => {
                    const filepath = path.join(FILES_DIR, file);
                    const stats = fs.statSync(filepath);
                    return {
                        name: file,
                        size: formatSize(stats.size)
                    };
                });
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(generateHTML(fileList));
        });
        return;
    }
    
    // 获取文件列表（API）
    if (method === 'GET' && parsedUrl.pathname === '/list') {
        fs.readdir(FILES_DIR, (err, files) => {
            if (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: '读取文件列表失败' }));
                return;
            }
            
            const fileList = files
                .filter(file => {
                    try {
                        return fs.statSync(path.join(FILES_DIR, file)).isFile();
                    } catch {
                        return false;
                    }
                })
                .map(file => {
                    const filepath = path.join(FILES_DIR, file);
                    const stats = fs.statSync(filepath);
                    return {
                        name: file,
                        size: formatSize(stats.size)
                    };
                });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(fileList));
        });
        return;
    }
    
    // 上传文件
    if (method === 'POST' && parsedUrl.pathname === '/upload') {
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
            try {
                // 简单解析multipart/form-data
                const data = Buffer.concat(body);
                const boundary = req.headers['content-type'].split('=')[1];
                const parts = data.toString().split('--' + boundary);
                
                for (const part of parts) {
                    if (part.includes('filename="')) {
                        const filenameMatch = part.match(/filename="([^"]+)"/);
                        if (filenameMatch) {
                            const filename = filenameMatch[1];
                            const fileStart = part.indexOf('\r\n\r\n') + 4;
                            const fileEnd = part.lastIndexOf('\r\n');
                            const fileContent = part.substring(fileStart, fileEnd);
                            
                            // 保存文件
                            const safeFilename = path.basename(filename);
                            fs.writeFileSync(path.join(FILES_DIR, safeFilename), fileContent);
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ 
                                success: true, 
                                filename: safeFilename,
                                message: '文件上传成功'
                            }));
                            return;
                        }
                    }
                }
                
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '未找到文件' }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }
    
    // 下载文件
    if (method === 'GET' && parsedUrl.pathname.startsWith('/download/')) {
        const filename = decodeURIComponent(parsedUrl.pathname.substring(10));
        const filepath = path.join(FILES_DIR, path.basename(filename));
        
        if (fs.existsSync(filepath)) {
            const stat = fs.statSync(filepath);
            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Content-Length': stat.size
            });
            
            const stream = fs.createReadStream(filepath);
            stream.pipe(res);
        } else {
            res.writeHead(404);
            res.end('文件不存在');
        }
        return;
    }
    
    // 测试接口
    if (method === 'GET' && parsedUrl.pathname === '/test') {
        res.writeHead(200);
        res.end('✅ 服务器正常！');
        return;
    }
    
    // 404处理
    res.writeHead(404);
    res.end('404 Not Found');
});

// 启动服务器
server.listen(PORT, () => {
    const localIP = getLocalIP();
    
    console.log('='.repeat(60));
    console.log('🚀 超简单文件共享工具启动成功！');
    console.log('='.repeat(60));
    console.log(`📁 文件目录：${FILES_DIR}`);
    console.log(`💻 电脑访问：http://localhost:${PORT}`);
    console.log(`📱 手机访问：http://${localIP}:${PORT}`);
    console.log(`⚡ 支持功能：文件上传、下载、拖拽上传、手机访问`);
    console.log('='.repeat(60));
    console.log('按 Ctrl+C 停止服务器');
    console.log('='.repeat(60));
});

// 处理进程退出
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});