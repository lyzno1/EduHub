const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const port = process.env.REACT_APP_API_URL ? new URL(process.env.REACT_APP_API_URL).port : 3001; // 使用环境变量或默认值3001
const path = require('path'); // 导入 path 模块
const { v4: uuidv4 } = require('uuid');

// 定义公共基础路径
const EDUHUB_BASE_PATH = path.join(__dirname, '../../../'); // 使用 __dirname 确保相对路径正确

// 使用 path.join 拼接文件路径
const filePath = path.join(EDUHUB_BASE_PATH, 'account.json');
const dify_keys = path.join(EDUHUB_BASE_PATH, 'dify_keys.json');
const studentChatPath = path.join(EDUHUB_BASE_PATH, 'studentChat.json');
const teacherChatPath = path.join(EDUHUB_BASE_PATH, 'teacherChat.json');
const promptPath = path.join(EDUHUB_BASE_PATH, 'prompt.json');
const helpPath = path.join(EDUHUB_BASE_PATH, 'help.json');
const lookPath = path.join(EDUHUB_BASE_PATH, 'looks.json');
const configPath = path.join(EDUHUB_BASE_PATH, 'config.json');
const whitelistPath = path.join(EDUHUB_BASE_PATH, 'whitelist.json');
const blacklistPath = path.join(EDUHUB_BASE_PATH, 'blacklist.json');
const openAiTsFile = path.join(EDUHUB_BASE_PATH, 'types/openai.ts');
const metadataJsonPath = path.join(EDUHUB_BASE_PATH, 'public/config/metadata.json');
const updateInfoPath = path.join(EDUHUB_BASE_PATH, 'public/config/update-info.json');

const bcrypt = require('bcryptjs');
const { exec } = require('child_process');


//后端
app.use(cors());
app.use(bodyParser.json());


//读取openAiTs文件内容
app.get('/read-openai-file', (req, res) => {

    fs.readFile(openAiTsFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).send('An error occurred while reading the file.');
        }

        res.type('text/plain'); // 设置响应类型为纯文本，因为我们正在读取一个TypeScript文件
        res.send(data); // 发送文件内容作为响应
    });
});

// 登录接口
app.post('/login', (req, res) => {
    console.log("登录请求")
    console.log(req.body);
    const { username, password } = req.body;

    // ------------- 原始逻辑 (已注释) -------------
    // const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // // const salt = "$2a$10$lAOe6jrPoDOI4tJarzjpBO"; // Salt 可能用于密码哈希，此处注释
    // const user = data.users.find(u => u.username === username);
    // console.log("@@@@@@@@@@@@@@@@@") // 原始调试输出
    //
    // if (user && bcrypt.compareSync(password, user.password)) {
    //     res.json({ success: true, message: '登录成功' });
    // } else {
    //     res.status(401).json({ success: false, message: '用户名或密码错误' });
    // }
    // ------------- 原始逻辑结束 -------------

    // ------------- 当前临时逻辑 ------------- 
    try {
        const accountData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 直接比较 account.json 中的用户名和明文密码
        if (accountData.username === username && accountData.password === password) {
            // 注意：这里使用了明文密码比较，不安全，仅为临时修改
            res.json({ success: true, message: '登录成功' });
        } else {
            res.status(401).json({ success: false, message: '用户名或密码错误' });
        }
    } catch (error) {
        console.error("读取或解析 account.json 出错:", error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
    // ------------- 当前临时逻辑结束 -----------
});

// 获取dify_keys数据 (修改：返回完整结构)
app.get('/getDify_keys', (req, res) => {
    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData); // 直接返回完整的嵌套结构
        } catch (parseError) {
            console.error("Error parsing dify_keys.json:", parseError);
            res.status(500).send('Error parsing data file');
        }
    });
});

// 新增：获取指定文件夹下所有卡片的接口
app.get('/getCardsInFolder/:folderKey', (req, res) => {
    const { folderKey } = req.params;
    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            if (!jsonData[folderKey]) {
                return res.status(404).send('Folder not found');
            }
            
            // 如果文件夹存在但没有cards字段，返回空数组
            const cards = jsonData[folderKey].cards || [];
            res.json(cards);
        } catch (parseError) {
            console.error("Error parsing dify_keys.json:", parseError);
            res.status(500).send('Error parsing data file');
        }
    });
});

app.get('/TestTs', (req, res) => {
    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        res.json(JSON.parse(data));
        console.log("res.json", res.json)
    });
});


app.post('/updateKeysData', (req, res) => {
    const { originalName, newName, newValue } = req.body;

    // 读取配置文件
    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading from file');
            return;
        }

        const jsonData = JSON.parse(data);
        // 检查原始文件夹是否存在
        if (!jsonData[originalName]) {
            res.status(404).send('Folder not found');
            return;
        }
        
        // 获取原始文件夹完整配置
        const folderData = jsonData[originalName];
        
        // 使用新的apiKey
        folderData.apiKey = newValue;
        
        // 如果名称需要改变
        if (originalName !== newName && newName.trim() !== "") {
            delete jsonData[originalName]; // 删除旧文件夹
            jsonData[newName] = folderData; // 用新名称创建文件夹
        } else {
            jsonData[originalName] = folderData; // 只更新值
        }

        fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error writing to file');
                return;
            }
            
            res.send('Data updated successfully');
        });
    });
});

// 删除dify_keys数据
app.post('/editChatName', (req, res) => {
    const { originalName, newName } = req.body;
    fs.readFile(studentChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading studentChat.json');
            return;
        }

        let studentChatData = JSON.parse(data);
        let updated = false;

        // 更新所有名称匹配的聊天
        studentChatData.Chats.forEach(chat => {
            if (chat.name === originalName) {
                chat.name = newName;
                updated = true;
            }
        });

        if (!updated) {
            res.send('No chat found with the original name, no update needed.');
            return;
        }
        fs.writeFile(studentChatPath, JSON.stringify(studentChatData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error writing to studentChat.json');
                return;
            }
            res.send('studentChat.json updated successfully');
        });
    });
});


app.post('/editTeacherChatName', (req, res) => {
    const { originalName, newName } = req.body;
    fs.readFile(teacherChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading studentChat.json');
            return;
        }

        let teacherChatData = JSON.parse(data);
        let updated = false;

        // 更新所有名称匹配的聊天
        teacherChatData.Chats.forEach(chat => {
            if (chat.name === originalName) {
                chat.name = newName;
                updated = true;
            }
        });

        if (!updated) {
            res.send('No chat found with the original name, no update needed.');
            return;
        }
        fs.writeFile(teacherChatPath, JSON.stringify(teacherChatData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error writing to studentChat.json');
                return;
            }
            res.send('studentChat.json updated successfully');
        });
    });
});

// 新增：删除文件夹接口 (替代 /deleteKeyData)
app.post('/deleteFolder', (req, res) => {
    const { folderKey } = req.body; // 前端发送的是 folderKey

    if (!folderKey) {
        return res.status(400).send('Folder key is required.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading dify_keys.json:", err);
            return res.status(500).send('Error reading data file');
        }
        
        try {
        const jsonData = JSON.parse(data);

            // 1. 检查文件夹是否存在
            if (!jsonData[folderKey]) {
                return res.status(404).send('Folder not found');
            }

            // 2. 检查文件夹下是否有卡片
            const folderToDelete = jsonData[folderKey];
            if (folderToDelete.cards && Array.isArray(folderToDelete.cards) && folderToDelete.cards.length > 0) {
                return res.status(400).send('Cannot delete folder because it contains cards. Please delete the cards first.');
            }

            // 3. 执行删除
            delete jsonData[folderKey];

            // 4. 写回文件
        fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
            if (err) {
                    console.error("Error writing dify_keys.json after delete:", err);
                    return res.status(500).send('Error writing data file');
            }
                res.send('Folder deleted successfully');
        });
        } catch (parseError) {
            console.error("Error processing dify_keys.json for delete:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});


// 新增：添加文件夹接口 (替代 /addApplication)
app.post('/addFolder', (req, res) => {
    const { displayName } = req.body; // 只从请求体获取 displayName

    if (!displayName || displayName.trim() === "") {
        return res.status(400).send('Display name is required.');
    }

    // 1. 读取现有数据
    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading dify_keys.json:", err);
            return res.status(500).send('Error reading data file');
        }

        try {
        const jsonData = JSON.parse(data);

            // 2. 生成 folderKey (使用 UUID v4)
            const folderKey = uuidv4(); 
            // 理论上 UUID 冲突概率极低，无需检查冲突
            // // 2. 生成 folderKey (基于 displayName, 转小写，空格转下划线，移除特殊字符)
            // //    并检查冲突
            // let baseFolderKey = displayName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            // let folderKey = baseFolderKey;
            // let counter = 1;
            // // 如果生成的 key 已存在，尝试添加数字后缀
            // while (jsonData[folderKey]) {
            //     folderKey = `${baseFolderKey}_${counter}`;
            //     counter++;
            //     // 可以加一个最大尝试次数限制，防止无限循环
            //     if (counter > 100) { 
            //          console.error("Failed to generate a unique folderKey for:", displayName);
            //          return res.status(500).send('Could not generate a unique identifier for the folder.');
            //     }
            // }

            // 3. 计算下一个 appId
            let maxAppId = -1; // 从-1开始，确保即使只有一个 global 也能正确生成
            Object.values(jsonData).forEach(folder => {
                // 确保 appId 是数字类型再比较
                const currentAppId = parseInt(folder.appId, 10);
                if (!isNaN(currentAppId) && currentAppId > maxAppId) {
                    maxAppId = currentAppId;
                }
            });
            const newAppId = maxAppId + 1;

            // 4. 创建新文件夹对象
            const newFolderData = {
                appId: newAppId,
                displayName: displayName.trim(), // 使用 trim 后的 displayName
            cards: [] // 初始化空卡片数组
        };

            // 5. 添加到 jsonData 并写回文件
            jsonData[folderKey] = newFolderData;

        fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
            if (err) {
                    console.error("Error writing dify_keys.json:", err);
                    res.status(500).send('Error writing data file');
                return;
            }
                // 返回成功信息，可以包含新创建的数据
                res.status(201).json({ message: 'Folder added successfully', folderKey: folderKey, data: newFolderData });
        });
        } catch (parseError) {
            console.error("Error processing dify_keys.json:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

// 获取studentChat数据
app.get('/getStudentChat', (req, res) => {
    fs.readFile(studentChatPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        res.json(JSON.parse(data));
    });
});

app.get('/getTeacherChat', (req, res) => {
    fs.readFile(teacherChatPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        res.json(JSON.parse(data));
    });
});
//编辑studentChat数据
app.post('/editChat', (req, res) => {
    const { id, newName, newIcon, newFolderName } = req.body;
    fs.readFile(studentChatPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        const studentChatData = JSON.parse(data);
        const chatIndex = studentChatData.Chats.findIndex(chat => chat.id === id);
        if (chatIndex === -1) {
            res.status(404).send('Chat not found');
            return;
        }
        // 查找新文件夹的ID
        const newFolder = studentChatData.Folders.find(folder => folder.name === newFolderName);
        if (!newFolder) {
            res.status(404).send('Folder not found');
            return;
        }
        // 更新聊天项数据
        studentChatData.Chats[chatIndex] = {
            ...studentChatData.Chats[chatIndex],
            id: uuidv4(), // 生成新的UUID
            name: newName,
            icon: newIcon,
            folderId: newFolder.id
        };
        fs.writeFile(studentChatPath, JSON.stringify(studentChatData, null, 2), 'utf8', (err) => {
            if (err) {
                res.status(500).send('Error writing to file');
                return;
            }
            res.send('Chat updated successfully');
        });
    });
});

app.post('/editChatTeacher', (req, res) => {
    const { id, newName, newIcon, newFolderName } = req.body;
    fs.readFile(teacherChatPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        const teacherChatData = JSON.parse(data);
        const chatIndex = teacherChatData.Chats.findIndex(chat => chat.id === id);
        if (chatIndex === -1) {
            res.status(404).send('Chat not found');
            return;
        }
        // 查找新文件夹的ID
        const newFolder = teacherChatData.Folders.find(folder => folder.name === newFolderName);
        if (!newFolder) {
            res.status(404).send('Folder not found');
            return;
        }
        // 更新聊天项数据
        teacherChatData.Chats[chatIndex] = {
            ...teacherChatData.Chats[chatIndex],
            id: uuidv4(), // 生成新的UUID
            name: newName,
            icon: newIcon,
            folderId: newFolder.id
        };
        fs.writeFile(teacherChatPath, JSON.stringify(teacherChatData, null, 2), 'utf8', (err) => {
            if (err) {
                res.status(500).send('Error writing to file');
                return;
            }
            res.send('Chat updated successfully');
        });
    });
});

app.delete('/deleteChat/:id', (req, res) => {
    const { id } = req.params;
    fs.readFile(studentChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading data file');
            return;
        }
        let studentChatData = JSON.parse(data);
        const chatIndex = studentChatData.Chats.findIndex(chat => chat.id === id);
        if (chatIndex === -1) {
            res.status(404).send('Chat not found');
            return;
        }
        // 删除指定的聊天记录
        studentChatData.Chats.splice(chatIndex, 1);
        fs.writeFile(studentChatPath, JSON.stringify(studentChatData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error writing to file');
                return;
            }
            res.send('Chat deleted successfully');
        });
    });
});

app.delete('/deleteChatByName/:name', (req, res) => {
    const { name } = req.params;
    fs.readFile(studentChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading data file');
            return;
        }
        let studentChatData = JSON.parse(data);
        // 使用filter方法移除所有名字匹配的聊天记录
        const originalLength = studentChatData.Chats.length;
        studentChatData.Chats = studentChatData.Chats.filter(chat => chat.name !== name);

        // 如果长度未变，说明没有找到匹配的聊天记录
        // if (studentChatData.Chats.length === originalLength) {
        //     res.status(404).send('Chat not found');
        //     return;
        // }

        // 将更新后的数据写回文件
        fs.writeFile(studentChatPath, JSON.stringify(studentChatData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error writing to file');
                return;
            }
            res.send('Chat(s) deleted successfully');
        });
    });
});

app.delete('/deleteTeacherChatByName/:name', (req, res) => {
    const { name } = req.params;
    fs.readFile(teacherChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading data file');
            return;
        }
        let teacherChatData = JSON.parse(data);
        // 使用filter方法移除所有名字匹配的聊天记录
        const originalLength = teacherChatData.Chats.length;
        teacherChatData.Chats = teacherChatData.Chats.filter(chat => chat.name !== name);

        // 如果长度未变，说明没有找到匹配的聊天记录
        // if (studentChatData.Chats.length === originalLength) {
        //     res.status(404).send('Chat not found');
        //     return;
        // }

        // 将更新后的数据写回文件
        fs.writeFile(teacherChatPath, JSON.stringify(teacherChatData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error writing to file');
                return;
            }
            res.send('Chat(s) deleted successfully');
        });
    });
})

app.delete('/deleteChatTeacher/:id', (req, res) => {
    const { id } = req.params;
    fs.readFile(teacherChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading data file');
            return;
        }
        let teacherChatData = JSON.parse(data);
        const chatIndex = teacherChatData.Chats.findIndex(chat => chat.id === id);
        if (chatIndex === -1) {
            res.status(404).send('Chat not found');
            return;
        }
        // 删除指定的聊天记录
        teacherChatData.Chats.splice(chatIndex, 1);
        fs.writeFile(teacherChatPath, JSON.stringify(teacherChatData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error writing to file');
                return;
            }
            res.send('Chat deleted successfully');
        });
    });
});

app.get('/getAppNames', (req, res) => {
    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading dify_keys.json');
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            const appNames = Object.keys(jsonData); // 获取所有键（应用名称）作为数组
            res.json(appNames); // 发送应用名称数组作为响应
        } catch (parseError) {
            console.error(parseError);
            res.status(500).send('Error parsing dify_keys.json');
        }
    });
});

app.post('/addChat', (req, res) => {
    const { name, icon, folderId } = req.body; // 假设请求体中已包含所有必要的聊天记录信息，包括API字段
    fs.readFile(studentChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading data file');
            return;
        }
        let studentChatData = JSON.parse(data);
        const newChat = {
            id: uuidv4(), // 自动生成UUID
            name,
            icon,
            folderId
        };
        studentChatData.Chats.push(newChat); // 将新聊天记录添加到数组中

        fs.writeFile(studentChatPath, JSON.stringify(studentChatData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error writing to file');
                return;
            }
            res.send('Chat added successfully');
        });
    });
});

app.post('/addChatTeacher', (req, res) => {
    const { name, icon, folderId } = req.body; // 假设请求体中已包含所有必要的聊天记录信息，包括API字段
    fs.readFile(teacherChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading data file');
            return;
        }
        let teacherChatData = JSON.parse(data);
        const newChat = {
            id: uuidv4(), // 自动生成UUID
            name,
            icon,
            folderId
        };
        teacherChatData.Chats.push(newChat); // 将新聊天记录添加到数组中

        fs.writeFile(teacherChatPath, JSON.stringify(teacherChatData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error writing to file');
                return;
            }
            res.send('Chat added successfully');
        });
    });
});

app.get('/getPrompts', (req, res) => {
    fs.readFile(promptPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            res.status(500).send('Error reading prompt file');
            return;
        }
        res.json(JSON.parse(data));
    });
});


app.post('/addFolder', (req, res) => {
    const { folderKey, folderData } = req.body;
    
    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        
        try {
            const jsonData = JSON.parse(data);
            if (jsonData[folderKey]) {
                return res.status(400).send('Folder already exists');
            }
            
            // 创建新文件夹，并初始化空cards数组
            jsonData[folderKey] = {
                ...folderData,
                cards: []
            };
            
            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) {
                    res.status(500).send('Error writing data file');
                    return;
                }
                res.send('Folder added successfully');
            });
        } catch (parseError) {
            console.error("Error parsing dify_keys.json:", parseError);
            res.status(500).send('Error parsing data file');
        }
    });
});

app.post('/addFolderTeacher', (req, res) => {
    const { name, type, deletable } = req.body;

    // 简单的验证
    if (!name || !type) {
        return res.status(400).send('Name and type are required');
    }

    // 读取现有的JSON文件
    fs.readFile(teacherChatPath, (err, data) => {
        if (err) {
            console.error('Failed to read JSON file:', err);
            return res.status(500).send('Failed to read data');
        }

        // 解析JSON数据
        const json = JSON.parse(data.toString());
        const newFolder = {
            id: uuidv4(), // 生成唯一ID
            name,
            type,
            deletable: !!deletable,
        };

        // 添加新文件夹到Folders数组
        json.Folders.push(newFolder);

        // 将更新后的数据写回JSON文件
        fs.writeFile(teacherChatPath, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                console.error('Failed to write JSON file:', err);
                return res.status(500).send('Failed to save data');
            }

            res.status(201).json(newFolder);
        });
    });
});


app.put('/editFolder/:id', (req, res) => {
    const { id } = req.params;
    const updatedFolder = req.body;

    fs.readFile(studentChatPath, (err, data) => {
        if (err) {
            res.status(500).send('Error reading JSON file');
            return;
        }

        const json = JSON.parse(data);
        const folders = json.Folders;
        const folderIndex = folders.findIndex(folder => folder.id === id);

        if (folderIndex === -1) {
            res.status(404).send('Folder not found');
            return;
        }

        // 更新文件夹信息
        folders[folderIndex] = { ...folders[folderIndex], ...updatedFolder };

        fs.writeFile(studentChatPath, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error writing JSON file');
                return;
            }

            res.json(folders[folderIndex]);
        });
    });
});


app.put('/editFolderTeacher/:id', (req, res) => {
    const { id } = req.params;
    const updatedFolder = req.body;

    fs.readFile(teacherChatPath, (err, data) => {
        if (err) {
            res.status(500).send('Error reading JSON file');
            return;
        }

        const json = JSON.parse(data);
        const folders = json.Folders;
        const folderIndex = folders.findIndex(folder => folder.id === id);

        if (folderIndex === -1) {
            res.status(404).send('Folder not found');
            return;
        }

        // 更新文件夹信息
        folders[folderIndex] = { ...folders[folderIndex], ...updatedFolder };

        fs.writeFile(teacherChatPath, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error writing JSON file');
                return;
            }

            res.json(folders[folderIndex]);
        });
    });
});

app.delete('/deleteFolder/:id', (req, res) => {
    const { id } = req.params;

    fs.readFile(studentChatPath, (err, data) => {
        if (err) {
            res.status(500).send('Error reading JSON file');
            return;
        }

        const json = JSON.parse(data);
        const folders = json.Folders;
        const chats = json.Chats;

        // 检查是否有属于该文件夹的聊天
        const hasChats = chats.some(chat => chat.folderId === id);
        if (hasChats) {
            res.status(400).send('Cannot delete folder because it contains chats');
            return;
        }

        // 删除文件夹
        const updatedFolders = folders.filter(folder => folder.id !== id);
        json.Folders = updatedFolders;

        fs.writeFile(studentChatPath, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error writing JSON file');
                return;
            }

            res.send('Folder deleted successfully');
        });
    });
});

app.delete('/deleteFolderTeacher/:id', (req, res) => {
    const { id } = req.params;

    fs.readFile(teacherChatPath, (err, data) => {
        if (err) {
            res.status(500).send('Error reading JSON file');
            return;
        }

        const json = JSON.parse(data);
        const folders = json.Folders;
        const chats = json.Chats;

        // 检查是否有属于该文件夹的聊天
        const hasChats = chats.some(chat => chat.folderId === id);
        if (hasChats) {
            res.status(400).send('Cannot delete folder because it contains chats');
            return;
        }

        // 删除文件夹
        const updatedFolders = folders.filter(folder => folder.id !== id);
        json.Folders = updatedFolders;

        fs.writeFile(teacherChatPath, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error writing JSON file');
                return;
            }

            res.send('Folder deleted successfully');
        });
    });
});


app.post('/updateFoldersOrder', (req, res) => {
    const { Folders } = req.body;
    fs.readFile(studentChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'An error occurred while reading the file.' });
        }

        const jsonData = JSON.parse(data);
        jsonData.Folders = Folders;

        fs.writeFile(studentChatPath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return res.status(500).json({ error: 'An error occurred while writing to the file.' });
            }
            res.status(200).json({ message: 'File updated successfully' });
        });
    });
});

app.post('/updateFoldersOrderTeacher', (req, res) => {
    const { Folders } = req.body;
    fs.readFile(teacherChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'An error occurred while reading the file.' });
        }

        const jsonData = JSON.parse(data);
        jsonData.Folders = Folders;

        fs.writeFile(teacherChatPath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return res.status(500).json({ error: 'An error occurred while writing to the file.' });
            }
            res.status(200).json({ message: 'File updated successfully' });
        });
    });
});


app.put('/updatePrompt/:id', (req, res) => {
    const { id } = req.params;
    const updatedPrompt = req.body;

    fs.readFile(promptPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }

        let jsonData = JSON.parse(data);
        let prompts = jsonData.Prompts;
        const promptIndex = prompts.findIndex(prompt => prompt.id === id);

        if (promptIndex === -1) {
            res.status(404).send('Prompt not found');
            return;
        }

        prompts[promptIndex] = { ...prompts[promptIndex], ...updatedPrompt };
        jsonData.Prompts = prompts;

        fs.writeFile(promptPath, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error writing data file');
                return;
            }
            res.json(prompts[promptIndex]);
        });
    });
});

app.delete('/deletePrompt/:id', (req, res) => {
    const { id } = req.params;

    fs.readFile(promptPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }

        let jsonData = JSON.parse(data);
        const prompts = jsonData.Prompts;
        const filteredPrompts = prompts.filter(prompt => prompt.id !== id);

        if (prompts.length === filteredPrompts.length) {
            res.status(404).send('Prompt not found');
            return;
        }

        jsonData.Prompts = filteredPrompts;

        fs.writeFile(promptPath, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error writing data file');
                return;
            }
            res.send('Prompt deleted successfully');
        });
    });
});

app.post('/addPrompt', (req, res) => {
    const newPrompt = req.body;
    newPrompt.id = uuidv4(); // 生成一个简单的UUID

    fs.readFile(promptPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }

        const jsonData = JSON.parse(data);
        jsonData.Prompts.push(newPrompt); // 添加到Prompts数组

        fs.writeFile(promptPath, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error writing data file');
                return;
            }
            res.json(newPrompt);
        });
    });
});

app.post('/addPromptFolder', (req, res) => {
    const { name, deletable } = req.body;

    // 简单的验证
    if (!name) {
        return res.status(400).send('Name is required');
    }

    // 读取现有的JSON文件
    fs.readFile(promptPath, (err, data) => {
        if (err) {
            console.error('Failed to read JSON file:', err);
            return res.status(500).send('Failed to read data');
        }

        // 解析JSON数据
        const json = JSON.parse(data.toString());
        const newFolder = {
            id: uuidv4(), // 生成唯一ID
            name,
            deletable: !!deletable, // 确保deletable是布尔值
        };

        // 添加新文件夹到Folders数组
        json.Folders.push(newFolder);

        // 将更新后的数据写回JSON文件
        fs.writeFile(promptPath, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                console.error('Failed to write JSON file:', err);
                return res.status(500).send('Failed to save data');
            }

            res.status(201).json(newFolder);
        });
    });
});


app.post('/updatePromptFolder/:id', (req, res) => {
    const { id } = req.params; // 从请求参数中获取文件夹ID
    const { name, deletable } = req.body; // 从请求体中获取更新的信息

    // 简单的验证
    if (!name) {
        return res.status(400).send('Name is required');
    }

    // 读取现有的JSON文件
    fs.readFile(promptPath, (err, data) => {
        if (err) {
            console.error('Failed to read JSON file:', err);
            return res.status(500).send('Failed to read data');
        }

        // 解析JSON数据
        const json = JSON.parse(data.toString());
        const folderIndex = json.Folders.findIndex(folder => folder.id === id);

        // 检查文件夹是否存在
        if (folderIndex === -1) {
            return res.status(404).send('Folder not found');
        }

        // 更新文件夹信息
        json.Folders[folderIndex] = {
            ...json.Folders[folderIndex],
            name,
            deletable: !!deletable, // 确保deletable是布尔值
        };

        // 将更新后的数据写回JSON文件
        fs.writeFile(promptPath, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                console.error('Failed to write JSON file:', err);
                return res.status(500).send('Failed to save data');
            }

            res.status(200).json(json.Folders[folderIndex]);
        });
    });
});

app.delete('/deletePromptFolder/:id', (req, res) => {
    const { id } = req.params;

    fs.readFile(promptPath, (err, data) => {
        if (err) {
            res.status(500).send('Error reading JSON file');
            return;
        }

        const json = JSON.parse(data);
        const folders = json.Folders;
        const prompts = json.Prompts;

        // 检查是否有属于该文件夹的提示词
        const hasPrompts = prompts.some(prompt => prompt.folderId === id);
        if (hasPrompts) {
            res.status(400).send('Cannot delete folder because it contains prompts');
            return;
        }

        // 删除文件夹
        const updatedFolders = folders.filter(folder => folder.id !== id);
        json.Folders = updatedFolders;

        fs.writeFile(promptPath, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error writing JSON file');
                return;
            }

            res.send('Folder deleted successfully');
        });
    });
});

app.post('/updatePromptFoldersOrder', (req, res) => {
    const { Folders } = req.body;

    fs.readFile(promptPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'An error occurred while reading the file.' });
        }

        const jsonData = JSON.parse(data);
        jsonData.Folders = Folders; // 更新Folders数组

        fs.writeFile(promptPath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return res.status(500).json({ error: 'An error occurred while writing to the file.' });
            }
            res.status(200).json({ message: 'File updated successfully' });
        });
    });
});

// app.post('/updatePromptsOrder', async (req, res) => {
//     const { updatedFolders } = req.body;
//
//     try {
//         const data = await fs.promises.readFile(promptPath, 'utf8');
//         const jsonData = JSON.parse(data);
//
//         updatedFolders.forEach(updatedFolder => {
//             updatedFolder.prompts.forEach((promptId, index) => {
//                 const promptIndex = jsonData.Prompts.findIndex(prompt => prompt.id === promptId);
//                 if (promptIndex !== -1) {
//                     jsonData.Prompts[promptIndex].order = index;
//                 }
//             });
//         });
//
//         await fs.promises.writeFile(promptPath, JSON.stringify(jsonData, null, 2));
//         res.send({ message: 'Prompts order and folders updated successfully' });
//     } catch (err) {
//         console.error('Failed to update prompts order:', err);
//         res.status(500).send('Failed to process the request');
//     }
// });

app.post('/updatePromptsOrder', async (req, res) => {
    const { updatedPromptsOrder } = req.body;

    try {
        const data = await fs.promises.readFile(promptPath, 'utf8');
        const jsonData = JSON.parse(data);

        // 重新排序 Prompts 数组
        const newPrompts = updatedPromptsOrder.map(orderItem => {
            const prompt = jsonData.Prompts.find(prompt => prompt.id === orderItem.id);
            if (prompt) {
                return { ...prompt, folderId: orderItem.folderId };
            }
            return null;
        }).filter(prompt => prompt !== null);

        jsonData.Prompts = newPrompts;

        await fs.promises.writeFile(promptPath, JSON.stringify(jsonData, null, 2));
        res.send({ message: 'Prompts order updated successfully' });
    } catch (err) {
        console.error('Failed to update prompts order:', err);
        res.status(500).send('Failed to process the request');
    }
});

app.post('/updateHelpData', (req, res) => {
    const newData = req.body;
    fs.writeFileSync(helpPath, JSON.stringify(newData, null, 2));
    res.send('Data updated successfully');
});
app.get('/helpData', (req, res) => {
    const helpData = JSON.parse(fs.readFileSync(helpPath));
    res.json(helpData);
});
app.post(helpPath, (req, res) => {
    const newData = req.body;

    // 将新数据写入到JSON文件中
    fs.writeFile('helpPath', JSON.stringify(newData, null, 2), (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error updating data: ' + err.message); // 将错误信息返回给前端
        } else {
            console.log('Data updated successfully');
            res.send('Data updated successfully');
        }
    });
});

app.get('/getAppearanceData', (req, res) => {
    const data = JSON.parse(fs.readFileSync(lookPath));
    res.json(data);
});

app.post('/saveAppearanceData', (req, res) => {
    const newData = req.body;
    fs.writeFile(lookPath, JSON.stringify(newData), (err) => {
        if (err) {
            console.error('保存外观数据失败:', err);
            res.status(500).send('保存失败');
        } else {
            res.json(newData);
        }
    });
});


//config
app.get('/getConfigData', (req, res) => {
    const data = JSON.parse(fs.readFileSync(configPath));
    res.json(data);
});

app.post('/saveConfigData', (req, res) => {
    const newData = req.body;
    fs.writeFile(configPath, JSON.stringify(newData), (err) => {
        if (err) {
            console.error('保存配置数据失败:', err);
            res.status(500).send('保存失败');
        } else {
            res.json(newData);
        }
    });
});

//tianji
app.get('/whitelist', (req, res) => {
    fs.readFile(whitelistPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const whitelist = JSON.parse(data);
        res.json(whitelist);
    });
});

app.post('/addwhitelist', (req, res) => {
    const { record } = req.body;
    fs.readFile(whitelistPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const whitelist = JSON.parse(data);
        whitelist.push(record);
        fs.writeFile(whitelistPath, JSON.stringify(whitelist), (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal Server Error');
                return;
            }
            res.send('Record added successfully');
        });
    });
});

app.delete('/deletewhitelist/:id', (req, res) => {
    const { id } = req.params;
    fs.readFile(whitelistPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        let jsonData = JSON.parse(data);
        jsonData = jsonData.filter(item => item !== id);
        fs.writeFile(whitelistPath, JSON.stringify(jsonData), 'utf8', (err) => {
            if (err) {
                res.status(500).send('Error writing to file');
                return;
            }
            res.send('Data deleted successfully');
        });
    });
});
//tianjiablack
app.get('/blacklist', (req, res) => {
    fs.readFile(blacklistPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const whitelist = JSON.parse(data);
        res.json(whitelist);
    });
});

app.post('/addblacklist', (req, res) => {
    const { record } = req.body;
    fs.readFile(blacklistPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const blacklist = JSON.parse(data);
        blacklist.push(record);
        fs.writeFile(blacklistPath, JSON.stringify(blacklist), (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal Server Error');
                return;
            }
            res.send('Record added successfully');
        });
    });
});

app.delete('/deleteblacklist/:id', (req, res) => {
    const { id } = req.params;
    fs.readFile(blacklistPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        let jsonData = JSON.parse(data);
        jsonData = jsonData.filter(item => item !== id);
        fs.writeFile(blacklistPath, JSON.stringify(jsonData), 'utf8', (err) => {
            if (err) {
                res.status(500).send('Error writing to file');
                return;
            }
            res.send('Data deleted successfully');
        });
    });
});

// app.post('/api/rebuild-and-restart', (req, res) => {
//     res.send('Endpoint hit successfully');
//   });
  
// // 构建并重启应用
app.post('/api/rebuild-and-restart', (req, res) => {
    console.log('Rebuilding and restarting the app...');
    exec('cd ../../.. && npm run build && pm2 restart eduhub', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send(`Error: ${error.message}`);
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        res.send('Application is being rebuilt and restarted');
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// 修改 CORS 配置，允许来自 3000 和 3002 端口的请求
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3002'] // 明确列出允许的源
    // 或者，如果开发环境不严格，可以更宽松，但不推荐用于生产:
    // origin: '*', // 允许所有源
    // origin: true // 反射请求源
}));

// ######## 卡片管理接口 ########

// 新增：添加卡片接口
app.post('/addCard', (req, res) => {
    const { folderKey, cardData } = req.body; // 主要用 cardData 里的信息

    if (!folderKey || !cardData || !cardData.cardId || !cardData.name || !cardData.difyConfig || !cardData.difyConfig.apiKey) {
        return res.status(400).send('Missing required fields: folderKey, cardId, name, difyConfig.apiKey.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading data file'); }

        try {
            const jsonData = JSON.parse(data);

            // 1. 检查文件夹是否存在
            if (!jsonData[folderKey]) {
                return res.status(404).send('Target folder not found');
            }

            // 确保 cards 数组存在
            if (!jsonData[folderKey].cards || !Array.isArray(jsonData[folderKey].cards)) {
                jsonData[folderKey].cards = [];
            }

            // 2. 检查卡片 ID 是否已存在于该文件夹
            const cardExists = jsonData[folderKey].cards.some(card => card.cardId === cardData.cardId);
            if (cardExists) {
                return res.status(409).send('Card with this ID already exists in the folder'); // 409 Conflict
            }

            // 3. 清理并准备新卡片数据 (只取需要的字段)
            const newCard = {
                cardId: cardData.cardId,
                name: cardData.name,
                iconName: cardData.iconName || "", // 确保有默认值
                difyConfig: {
                    apiKey: cardData.difyConfig.apiKey,
                    apiUrl: cardData.difyConfig.apiUrl || 'https://api.dify.ai/v1' // 确保有默认值
                }
            };

            // 4. 添加卡片到数组
            jsonData[folderKey].cards.push(newCard);

            // 5. 写回文件
            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) { return res.status(500).send('Error writing data file'); }
                res.status(201).json({ message: 'Card added successfully', data: newCard });
            });
        } catch (parseError) {
            console.error("Error processing addCard:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

// 新增：更新卡片接口
app.post('/updateCard', (req, res) => {
    const { folderKey, cardId, cardData } = req.body; // cardId 用于定位，cardData 是新数据

    if (!folderKey || !cardId || !cardData || !cardData.name || !cardData.difyConfig || !cardData.difyConfig.apiKey) {
        return res.status(400).send('Missing required fields for update.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading data file'); }

        try {
            const jsonData = JSON.parse(data);

            // 1. 检查文件夹是否存在
            if (!jsonData[folderKey] || !jsonData[folderKey].cards || !Array.isArray(jsonData[folderKey].cards)) {
                return res.status(404).send('Target folder or cards array not found');
            }

            // 2. 查找要更新的卡片索引
            const cardIndex = jsonData[folderKey].cards.findIndex(card => card.cardId === cardId);
            if (cardIndex === -1) {
                return res.status(404).send('Card not found in the folder');
            }

            // 3. 准备更新后的卡片数据 (保留原始 cardId)
            const updatedCard = {
                cardId: cardId, // ID 一般不更新
                name: cardData.name,
                iconName: cardData.iconName || "",
                difyConfig: {
                    apiKey: cardData.difyConfig.apiKey,
                    apiUrl: cardData.difyConfig.apiUrl || 'https://api.dify.ai/v1'
                }
            };

            // 4. 更新数组中的卡片
            jsonData[folderKey].cards[cardIndex] = updatedCard;

            // 5. 写回文件
            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) { return res.status(500).send('Error writing data file'); }
                res.json({ message: 'Card updated successfully', data: updatedCard });
            });
        } catch (parseError) {
            console.error("Error processing updateCard:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

// 新增：删除卡片接口
app.post('/deleteCard', (req, res) => {
    const { folderKey, cardId } = req.body;

    if (!folderKey || !cardId) {
        return res.status(400).send('Missing required fields: folderKey, cardId.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading data file'); }

        try {
            const jsonData = JSON.parse(data);

            // 1. 检查文件夹是否存在
            if (!jsonData[folderKey] || !jsonData[folderKey].cards || !Array.isArray(jsonData[folderKey].cards)) {
                return res.status(404).send('Target folder or cards array not found');
            }

            // 2. 查找要删除的卡片索引
            const cardIndex = jsonData[folderKey].cards.findIndex(card => card.cardId === cardId);
            if (cardIndex === -1) {
                return res.status(404).send('Card not found in the folder');
            }

            // 3. 从数组中删除卡片
            jsonData[folderKey].cards.splice(cardIndex, 1);

            // 4. 写回文件
            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) { return res.status(500).send('Error writing data file'); }
                res.send('Card deleted successfully');
            });
        } catch (parseError) {
            console.error("Error processing deleteCard:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

// 修改：更新文件夹接口，增加处理 difyConfig (仅针对 global)
app.post('/updateFolder', (req, res) => {
    // -------- 接收 displayName 和可能的 apiUrl 或 difyConfig --------
    const { originalKey, displayName, apiUrl, difyConfig } = req.body;

    if (!originalKey || !displayName || displayName.trim() === "") {
        return res.status(400).send('Original key and display name are required.');
    }
    // -------- 对 global 的 difyConfig 做额外校验 (保持不变) --------
    // 注意：这个校验现在可能不完全适用，因为我们可能只更新 displayName 和 apiUrl
    // 但保留它可以防止意外传入不完整的 difyConfig
    // if (originalKey === 'global' && difyConfig && (!difyConfig.apiKey || !difyConfig.apiUrl)) {
    //     return res.status(400).send('Global folder requires difyConfig with apiKey and apiUrl for update.');
    // }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { 
            console.error("Error reading dify_keys.json for updateFolder:", err);
            return res.status(500).send('Error reading data file'); 
        }

        try {
            const jsonData = JSON.parse(data);

            // 1. 检查文件夹是否存在
            if (!jsonData[originalKey]) {
                return res.status(404).send('Folder not found');
            }

            // 2. 更新 displayName (对所有文件夹都更新)
            jsonData[originalKey].displayName = displayName.trim();

            // -------- 3. 特殊处理 global key --------
            if (originalKey === 'global') {
                // 更新顶级的 apiUrl (如果请求中提供了)
                if (apiUrl !== undefined) { // 检查 apiUrl 是否在请求中
                   jsonData[originalKey].apiUrl = apiUrl;
                   console.log(`Global apiUrl updated for key: ${originalKey} to: ${apiUrl}`);
            }
                // (可选) 如果仍然需要通过 difyConfig 更新 global 的某些属性，可以在这里添加逻辑
                // else if (difyConfig) { ... }
            }
            // -------- global 处理结束 --------

            // 4. 写回文件
            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) { 
                    console.error("Error writing dify_keys.json after updateFolder:", err);
                    return res.status(500).send('Error writing data file'); 
                }
                // -------- 返回成功信息和更新后的数据 --------
                // 注意：这里返回的是 jsonData[originalKey]，包含了整个文件夹对象
                // 前端在 handleSaveGeneralSettings 中判断 success 时需要注意后端是否真的返回了这个字段
                // 为了更健壮，直接返回成功消息
                res.json({ success: true, message: 'Folder updated successfully', data: jsonData[originalKey] });
            });
        } catch (parseError) {
            console.error("Error processing dify_keys.json for updateFolder:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

// ######## 全局模型管理接口 ########

// 添加全局模型
app.post('/addGlobalModel', (req, res) => {
    const { name, apiKey, isDefault } = req.body;

    if (!name || !apiKey) {
        return res.status(400).send('Model name and API Key are required.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading data file'); }

        try {
            const jsonData = JSON.parse(data);
            if (!jsonData.global || !Array.isArray(jsonData.global.models)) {
                jsonData.global = { ...(jsonData.global || {}), models: [] }; // 初始化 models 数组
            }

            // 检查模型名称是否已存在
            const nameExists = jsonData.global.models.some(model => model.name === name);
            if (nameExists) {
                return res.status(409).send('Model with this name already exists.');
            }

            const newModel = {
                name: name,
                apiKey: apiKey,
                isDefault: !!isDefault // 确保是布尔值
            };

            // 如果新模型要设为默认，取消其他模型的默认状态
            if (newModel.isDefault) {
                jsonData.global.models.forEach(model => model.isDefault = false);
            }

            jsonData.global.models.push(newModel);

            // 如果添加后没有默认模型了（比如是第一个模型，或者添加时没设为默认），自动将第一个设为默认
            const hasDefault = jsonData.global.models.some(model => model.isDefault);
            if (!hasDefault && jsonData.global.models.length > 0) {
                jsonData.global.models[0].isDefault = true;
            }

            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) { return res.status(500).send('Error writing data file'); }
                res.status(201).json({ success: true, message: 'Model added successfully', data: newModel });
            });
        } catch (parseError) {
            console.error("Error processing addGlobalModel:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

// 更新全局模型 (支持名称修改)
app.post('/updateGlobalModel', (req, res) => {
    const { originalName, newData } = req.body; // 接收 originalName 和 newData

    // 校验 newData 内容
    if (!originalName || !newData || !newData.name || !newData.apiKey) {
        return res.status(400).send('Original name, new name, and new API Key are required for update.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading data file'); }

        try {
            const jsonData = JSON.parse(data);
            if (!jsonData.global || !Array.isArray(jsonData.global.models)) {
                return res.status(404).send('Global models data not found.');
            }

            // 1. 使用 originalName 查找模型索引
            const modelIndex = jsonData.global.models.findIndex(model => model.name === originalName);
            if (modelIndex === -1) {
                return res.status(404).send('Model with original name not found.');
            }

            // 2. 检查新名称是否与**其他**模型冲突
            if (originalName !== newData.name) { // 只有在名称改变时才检查冲突
                const newNameExists = jsonData.global.models.some((model, index) => index !== modelIndex && model.name === newData.name);
                if (newNameExists) {
                    return res.status(409).send('Another model with the new name already exists.');
                }
            }

            // 3. 准备更新后的模型数据
            const updatedModel = {
                // ...jsonData.global.models[modelIndex], // 不再需要展开旧数据，直接用新的
                name: newData.name,       // 使用新名称
                apiKey: newData.apiKey,   // 使用新 apiKey
                isDefault: !!newData.isDefault // 确保是布尔值
            };

            // 4. 处理 isDefault 逻辑
            if (updatedModel.isDefault) {
                // 如果将此模型设为默认，取消其他模型的默认状态
                jsonData.global.models.forEach((model, index) => {
                    if (index !== modelIndex) {
                        model.isDefault = false;
                    }
                });
            } else {
                // 如果取消默认，并且它是当前唯一的默认模型，则需要指定一个新的默认（例如第一个）
                const currentDefault = jsonData.global.models.find((model, index) => index !== modelIndex && model.isDefault);
                // 如果找不到其他的默认模型（说明原模型是唯一默认），并且列表不止一个模型
                if (!currentDefault && jsonData.global.models[modelIndex].isDefault && jsonData.global.models.length > 1) {
                     // 注意：这里不能直接修改 updatedModel.isDefault = true
                     // 应该在更新数组前先找到新的默认模型
                     // 将第一个非当前编辑的模型设为默认
                     const newDefaultIndex = jsonData.global.models.findIndex((_, index) => index !== modelIndex);
                     if (newDefaultIndex !== -1) {
                         jsonData.global.models[newDefaultIndex].isDefault = true;
                     }
                } else if (jsonData.global.models.length === 1) {
                    // 如果只有一个模型，取消默认时强制其为默认
                    updatedModel.isDefault = true;
                }
            }
            
            // 5. 更新数组中的模型
            jsonData.global.models[modelIndex] = updatedModel;

            // 6. 再次确保至少有一个默认模型 (以防万一)
             const hasDefault = jsonData.global.models.some(model => model.isDefault);
             if (!hasDefault && jsonData.global.models.length > 0) {
                 // 如果没有默认了，将第一个设为默认
                 jsonData.global.models[0].isDefault = true;
             }

            // 7. 写回文件
            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) { return res.status(500).send('Error writing data file'); }
                res.json({ success: true, message: 'Model updated successfully', data: updatedModel });
            });
        } catch (parseError) {
            console.error("Error processing updateGlobalModel:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

// 删除全局模型
app.post('/deleteGlobalModel', (req, res) => {
    const { name } = req.body; // 按名称删除

    if (!name) {
        return res.status(400).send('Model name is required for deletion.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading data file'); }

        try {
            const jsonData = JSON.parse(data);
            if (!jsonData.global || !Array.isArray(jsonData.global.models)) {
                return res.status(404).send('Global models data not found.');
            }

            const modelIndex = jsonData.global.models.findIndex(model => model.name === name);
            if (modelIndex === -1) {
                return res.status(404).send('Model not found.');
            }

            // 检查是否为默认模型
            if (jsonData.global.models[modelIndex].isDefault) {
                return res.status(400).send('Cannot delete the default model.');
            }

            // 删除模型
            jsonData.global.models.splice(modelIndex, 1);

            // 确保删除后仍有默认模型（如果列表不为空）
            const hasDefault = jsonData.global.models.some(model => model.isDefault);
            if (!hasDefault && jsonData.global.models.length > 0) {
                jsonData.global.models[0].isDefault = true;
            }

            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) { return res.status(500).send('Error writing data file'); }
                res.json({ success: true, message: 'Model deleted successfully' });
            });
        } catch (parseError) {
            console.error("Error processing deleteGlobalModel:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

// 设置默认全局模型
app.post('/setGlobalDefaultModel', (req, res) => {
    const { name } = req.body; // 按名称设置默认

    if (!name) {
        return res.status(400).send('Model name is required to set as default.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading data file'); }

        try {
            const jsonData = JSON.parse(data);
            if (!jsonData.global || !Array.isArray(jsonData.global.models)) {
                return res.status(404).send('Global models data not found.');
            }

            let modelFound = false;
            jsonData.global.models.forEach(model => {
                if (model.name === name) {
                    model.isDefault = true;
                    modelFound = true;
                } else {
                    model.isDefault = false;
                }
            });

            if (!modelFound) {
                return res.status(404).send('Model not found.');
            }

            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) { return res.status(500).send('Error writing data file'); }
                res.json({ success: true, message: `Model '${name}' set as default successfully` });
            });
        } catch (parseError) {
            console.error("Error processing setGlobalDefaultModel:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

// 获取 metadata.json 内容接口
app.get('/getMetadata', (req, res) => {
    fs.readFile(metadataJsonPath, 'utf8', (err, data) => {
        if (err) {
            // 如果文件不存在，返回包含 pageTitle 的默认结构
            if (err.code === 'ENOENT') {
                console.warn(`metadata.json not found at ${metadataJsonPath}, returning default structure.`);
                res.json({
                    title: '',
                    subtitle: '',
                    pageTitle: 'BistuCopilot', // 添加默认 pageTitle
                    aboutContent: '',
                    version: '',
                    copyright: '',
                    additionalInfo: {
                        developer: '',
                        website: ''
                    }
                });
            } else {
                console.error(`读取 metadata.json 失败: ${err}`);
                res.status(500).send('读取元数据文件失败');
            }
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            // 确保返回的数据包含 pageTitle，如果缺少则添加默认值
            const completeData = {
                title: jsonData.title || '',
                subtitle: jsonData.subtitle || '',
                pageTitle: jsonData.pageTitle || 'BistuCopilot',
                aboutContent: jsonData.aboutContent || '',
                version: jsonData.version || '',
                copyright: jsonData.copyright || '',
                additionalInfo: {
                    developer: jsonData.additionalInfo?.developer || '',
                    website: jsonData.additionalInfo?.website || ''
                }
            };
            res.json(completeData);
        } catch (parseError) {
            console.error(`解析 metadata.json 失败: ${parseError}`);
            res.status(500).send('解析元数据文件失败');
        }
    });
});

// 更新 metadata.json 内容接口
app.post('/updateMetadata', (req, res) => { 
    const newMetadata = req.body; 

    // 更新验证逻辑，确保包含 pageTitle
    if (!newMetadata || 
        typeof newMetadata.title !== 'string' || 
        typeof newMetadata.subtitle !== 'string' || 
        typeof newMetadata.pageTitle !== 'string' || // 验证 pageTitle
        typeof newMetadata.aboutContent !== 'string' ||
        typeof newMetadata.version !== 'string' || 
        typeof newMetadata.copyright !== 'string' || 
        typeof newMetadata.additionalInfo !== 'object' ||
        newMetadata.additionalInfo === null || 
        typeof newMetadata.additionalInfo.developer !== 'string' ||
        typeof newMetadata.additionalInfo.website !== 'string') {
        return res.status(400).json({
            success: false,
            message: '提供的元数据数据格式无效或缺少字段'
        });
    }

    fs.writeFile(metadataJsonPath, JSON.stringify(newMetadata, null, 2), 'utf8', (err) => { 
        if (err) {
            console.error(`写入 metadata.json 失败: ${err}`);
            return res.status(500).json({ 
                success: false, 
                message: '更新元数据文件失败' 
            });
        }
        console.log('metadata.json 更新成功');
        res.json({ success: true, message: '元数据更新成功', data: newMetadata });
    });
});

// ######## NEW APIs for App/Card Configuration ########

// GET /api/available-apps: Reads dify_keys.json and returns non-global apps/cards
app.get('/api/available-apps', (req, res) => {
    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading dify_keys.json:", err);
            return res.status(500).send('Error reading available apps data');
        }
        try {
            const allApps = JSON.parse(data);
            const availableApps = {};
            // Filter out 'global' and extract needed info
            Object.keys(allApps).forEach(folderKey => {
                if (folderKey !== 'global') {
                    const appData = allApps[folderKey];
                    availableApps[folderKey] = {
                        displayName: appData.displayName || folderKey,
                        cards: (appData.cards || []).map(card => ({ // Ensure cards array exists
                            cardId: card.cardId,
                            name: card.name,
                            iconName: card.iconName
                            // Add other fields if needed by frontend display
                        }))
                    };
                }
            });
            res.json(availableApps);
        } catch (parseError) {
            console.error("Error parsing dify_keys.json for available apps:", parseError);
            res.status(500).send('Error processing available apps data');
        }
    });
});

// Helper function to read config JSON safely
const readConfigJson = (filePath, res, callback) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            // If file doesn't exist, return the default structure
            if (err.code === 'ENOENT') {
                console.warn(`${path.basename(filePath)} not found, returning default structure.`);
                return callback(null, { allowedApps: {} });
            }
            console.error(`Error reading ${path.basename(filePath)}:`, err);
            return res.status(500).send(`Error reading ${path.basename(filePath)}`);
        }
        try {
            const jsonData = JSON.parse(data);
            // Basic validation: ensure allowedApps is an object
            if (typeof jsonData.allowedApps !== 'object' || jsonData.allowedApps === null) {
                 console.error(`Invalid structure in ${path.basename(filePath)}: allowedApps is not an object.`);
                 // Return default structure on invalid format
                 return callback(null, { allowedApps: {} }); 
            }
            callback(null, jsonData);
        } catch (parseError) {
            console.error(`Error parsing ${path.basename(filePath)}:`, parseError);
            // Return default structure on parse error
            callback(null, { allowedApps: {} }); 
            // Alternatively, send error: res.status(500).send(`Error parsing ${path.basename(filePath)}`);
        }
    });
};

// GET /api/student-config: Reads studentChat.json
app.get('/api/student-config', (req, res) => {
    readConfigJson(studentChatPath, res, (err, data) => {
        if (err) { /* Error already handled by readConfigJson sending response */ return; }
        res.json(data);
    });
});

// GET /api/teacher-config: Reads teacherChat.json
app.get('/api/teacher-config', (req, res) => {
    readConfigJson(teacherChatPath, res, (err, data) => {
        if (err) { /* Error already handled by readConfigJson sending response */ return; }
        res.json(data);
    });
});

// Helper function to write config JSON safely
const writeConfigJson = (filePath, data, res, callback) => {
     // Basic validation of incoming data
     if (typeof data !== 'object' || data === null || typeof data.allowedApps !== 'object' || data.allowedApps === null) {
        console.error(`Invalid data format received for ${path.basename(filePath)}`);
        return res.status(400).send(`Invalid data format for ${path.basename(filePath)}.`);
    }
    // Ensure only allowedApps is written
    const dataToWrite = { allowedApps: data.allowedApps }; 

    fs.writeFile(filePath, JSON.stringify(dataToWrite, null, 2), 'utf8', (err) => {
        if (err) {
            console.error(`Error writing ${path.basename(filePath)}:`, err);
            return res.status(500).send(`Error writing ${path.basename(filePath)}`);
        }
        callback();
    });
};

// POST /api/update-student-config: Writes to studentChat.json
app.post('/api/update-student-config', (req, res) => {
    const newConfig = req.body;
    writeConfigJson(studentChatPath, newConfig, res, () => {
        res.json({ success: true, message: 'Student configuration updated successfully.' });
    });
});

// POST /api/update-teacher-config: Writes to teacherChat.json
app.post('/api/update-teacher-config', (req, res) => {
    const newConfig = req.body;
    writeConfigJson(teacherChatPath, newConfig, res, () => {
        res.json({ success: true, message: 'Teacher configuration updated successfully.' });
    });
});

// ######## END NEW APIs ########

// 获取更新信息
app.get('/getUpdateInfo', (req, res) => {
    fs.readFile(updateInfoPath, 'utf8', (err, data) => {
        if (err) {
            // 如果文件不存在，返回默认结构
            if (err.code === 'ENOENT') {
                console.warn(`update-info.json not found at ${updateInfoPath}, returning default structure.`);
                return res.json({
                    version: '',
                    title: '最新功能更新',
                    date: '',
                    content: []
                });
            }
            console.error(`读取更新信息文件失败: ${err}`);
            return res.status(500).json({ 
                success: false, 
                message: '读取更新信息文件失败' 
            });
        }
        
        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch (parseError) {
            console.error(`解析更新信息文件失败: ${parseError}`);
            res.status(500).json({ 
                success: false, 
                message: '解析更新信息文件失败' 
            });
        }
    });
});

// 更新更新信息
app.post('/updateUpdateInfo', (req, res) => {
    const newUpdateInfo = req.body;
    
    // 验证更新信息数据结构
    if (!newUpdateInfo || 
        typeof newUpdateInfo.title !== 'string' || 
        !Array.isArray(newUpdateInfo.content)) {
        return res.status(400).json({
            success: false,
            message: '提供的更新信息数据格式无效或缺少必要字段'
        });
    }
    
    // 确保版本号格式正确
    if (newUpdateInfo.version && !/^\d+\.\d+\.\d+$/.test(newUpdateInfo.version)) {
        return res.status(400).json({
            success: false,
            message: '版本号格式无效，请使用类似 1.0.0 的格式'
        });
    }
    
    // 创建父目录（如果不存在）
    const dirPath = path.dirname(updateInfoPath);
    if (!fs.existsSync(dirPath)) {
        try {
            fs.mkdirSync(dirPath, { recursive: true });
        } catch (mkdirError) {
            console.error(`创建目录失败: ${mkdirError}`);
            return res.status(500).json({
                success: false,
                message: '创建目录失败'
            });
        }
    }
    
    // 写入文件
    fs.writeFile(updateInfoPath, JSON.stringify(newUpdateInfo, null, 2), 'utf8', (err) => {
        if (err) {
            console.error(`写入更新信息文件失败: ${err}`);
            return res.status(500).json({
                success: false,
                message: '写入更新信息文件失败'
            });
        }
        
        console.log('更新信息保存成功');
        res.json({
            success: true,
            message: '更新信息保存成功',
            data: newUpdateInfo
        });
    });
});

