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
const promptFunctionCardsPath = path.join(EDUHUB_BASE_PATH, 'promptFunctionCards.json'); 

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

        res.type('text/plain'); 
        res.send(data); 
    });
});

// 登录接口
app.post('/login', (req, res) => {
    console.log("登录请求")
    console.log(req.body);
    const { username, password } = req.body;

    try {
        const accountData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (accountData.username === username && accountData.password === password) {
            res.json({ success: true, message: '登录成功' });
        } else {
            res.status(401).json({ success: false, message: '用户名或密码错误' });
        }
    } catch (error) {
        console.error("读取或解析 account.json 出错:", error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// 获取dify_keys数据 
app.get('/getDify_keys', (req, res) => {
    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data file');
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData); 
        } catch (parseError) {
            console.error("Error parsing dify_keys.json:", parseError);
            res.status(500).send('Error parsing data file');
        }
    });
});

// 获取指定文件夹下所有卡片的接口
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

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading from file');
            return;
        }

        const jsonData = JSON.parse(data);
        if (!jsonData[originalName]) {
            res.status(404).send('Folder not found');
            return;
        }
        
        const folderData = jsonData[originalName];
        folderData.apiKey = newValue;
        
        if (originalName !== newName && newName.trim() !== "") {
            delete jsonData[originalName]; 
            jsonData[newName] = folderData; 
        } else {
            jsonData[originalName] = folderData; 
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
            res.status(500).send('Error reading teacherChat.json'); 
            return;
        }

        let teacherChatData = JSON.parse(data);
        let updated = false;

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
                res.status(500).send('Error writing to teacherChat.json'); 
                return;
            }
            res.send('teacherChat.json updated successfully'); 
        });
    });
});

app.post('/deleteFolder', (req, res) => {
    const { folderKey } = req.body; 

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

            if (!jsonData[folderKey]) {
                return res.status(404).send('Folder not found');
            }

            const folderToDelete = jsonData[folderKey];
            if (folderToDelete.cards && Array.isArray(folderToDelete.cards) && folderToDelete.cards.length > 0) {
                return res.status(400).send('Cannot delete folder because it contains cards. Please delete the cards first.');
            }

            delete jsonData[folderKey];

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


app.post('/addFolder', (req, res) => {
    const { displayName } = req.body; 

    if (!displayName || displayName.trim() === "") {
        return res.status(400).send('Display name is required.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading dify_keys.json:", err);
            return res.status(500).send('Error reading data file');
        }

        try {
        const jsonData = JSON.parse(data);
            const folderKey = uuidv4(); 
            
            let maxAppId = -1; 
            Object.values(jsonData).forEach(folder => {
                const currentAppId = parseInt(folder.appId, 10);
                if (!isNaN(currentAppId) && currentAppId > maxAppId) {
                    maxAppId = currentAppId;
                }
            });
            const newAppId = maxAppId + 1;

            const newFolderData = {
                appId: newAppId,
                displayName: displayName.trim(), 
                cards: [] 
            };

            jsonData[folderKey] = newFolderData;

        fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
            if (err) {
                    console.error("Error writing dify_keys.json:", err);
                    res.status(500).send('Error writing data file');
                return;
            }
                res.status(201).json({ message: 'Folder added successfully', folderKey: folderKey, data: newFolderData });
        });
        } catch (parseError) {
            console.error("Error processing dify_keys.json:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

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
        const newFolder = studentChatData.Folders.find(folder => folder.name === newFolderName);
        if (!newFolder) {
            res.status(404).send('Folder not found');
            return;
        }
        studentChatData.Chats[chatIndex] = {
            ...studentChatData.Chats[chatIndex],
            id: uuidv4(), 
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
        const newFolder = teacherChatData.Folders.find(folder => folder.name === newFolderName);
        if (!newFolder) {
            res.status(404).send('Folder not found');
            return;
        }
        teacherChatData.Chats[chatIndex] = {
            ...teacherChatData.Chats[chatIndex],
            id: uuidv4(), 
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
        studentChatData.Chats = studentChatData.Chats.filter(chat => chat.name !== name);

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
        teacherChatData.Chats = teacherChatData.Chats.filter(chat => chat.name !== name);

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
            const appNames = Object.keys(jsonData); 
            res.json(appNames); 
        } catch (parseError) {
            console.error(parseError);
            res.status(500).send('Error parsing dify_keys.json');
        }
    });
});

app.post('/addChat', (req, res) => {
    const { name, icon, folderId } = req.body; 
    fs.readFile(studentChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading data file');
            return;
        }
        let studentChatData = JSON.parse(data);
        const newChat = {
            id: uuidv4(), 
            name,
            icon,
            folderId
        };
        studentChatData.Chats.push(newChat); 

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
    const { name, icon, folderId } = req.body; 
    fs.readFile(teacherChatPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading data file');
            return;
        }
        let teacherChatData = JSON.parse(data);
        const newChat = {
            id: uuidv4(), 
            name,
            icon,
            folderId
        };
        teacherChatData.Chats.push(newChat); 

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

// 获取所有类型的提示词数据
app.get('/getPrompts', async (req, res) => {
    try {
        // 读取 AppCard Prompts
        let appCardPromptsData = {};
        try {
            const appCardFileContent = await fs.promises.readFile(promptPath, 'utf8');
            appCardPromptsData = JSON.parse(appCardFileContent).appCardPrompts || {};
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`prompt.json not found at ${promptPath}, returning empty appCardPrompts.`);
            } else {
                console.error('Error reading appCardPrompts from prompt.json:', err);
            }
        }

        // 读取 General Prompts (Function Cards)
        let generalPromptsData = [];
        try {
            console.log(`Attempting to read general prompts from: ${promptFunctionCardsPath}`);
            const generalPromptsFileContent = await fs.promises.readFile(promptFunctionCardsPath, 'utf8');
            const parsedData = JSON.parse(generalPromptsFileContent);
            if (Array.isArray(parsedData)) {
                generalPromptsData = parsedData;
                console.log(`Successfully read and parsed ${generalPromptsData.length} general prompt folders.`);
            } else {
                console.error(`Parsed data from promptFunctionCards.json is not an array. Received:`, parsedData);
                generalPromptsData = []; 
            }
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`promptFunctionCards.json not found at ${promptFunctionCardsPath}. Returning empty array for general prompts.`);
            } else {
                console.error('Error reading or parsing generalPrompts from promptFunctionCards.json:', err);
            }
            generalPromptsData = []; 
        }

        res.json({
            appCardPrompts: appCardPromptsData,
            generalPrompts: generalPromptsData
        });

    } catch (error) {
        console.error('Failed to fetch prompts data:', error);
        res.status(500).send('Error fetching prompts data');
    }
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
                return res.status(400).send('Folder already exists in dify_keys.json');
            }
            
            jsonData[folderKey] = {
                ...folderData,
                cards: folderData.cards || [] 
            };
            
            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) {
                    res.status(500).send('Error writing data file');
                    return;
                }
                res.send('Folder added successfully to dify_keys.json');
            });
        } catch (parseError) {
            console.error("Error parsing dify_keys.json:", parseError);
            res.status(500).send('Error parsing data file');
        }
    });
});

app.post('/addFolderTeacher', (req, res) => { 
    const { name, type, deletable } = req.body;

    if (!name || !type) {
        return res.status(400).send('Name and type are required');
    }

    fs.readFile(teacherChatPath, (err, data) => {
        if (err) {
            console.error('Failed to read JSON file:', err);
            return res.status(500).send('Failed to read data');
        }

        const json = JSON.parse(data.toString());
        const newFolder = {
            id: uuidv4(), 
            name,
            type,
            deletable: !!deletable,
        };

        if (!json.Folders) json.Folders = []; 
        json.Folders.push(newFolder);

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
        if (!json.Folders) {
             return res.status(404).send('Folders array not found in studentChat.json');
        }
        const folders = json.Folders;
        const folderIndex = folders.findIndex(folder => folder.id === id);

        if (folderIndex === -1) {
            res.status(404).send('Folder not found');
            return;
        }

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
         if (!json.Folders) {
             return res.status(404).send('Folders array not found in teacherChat.json');
        }
        const folders = json.Folders;
        const folderIndex = folders.findIndex(folder => folder.id === id);

        if (folderIndex === -1) {
            res.status(404).send('Folder not found');
            return;
        }

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
        if (!json.Folders || !json.Chats) {
            return res.status(404).send('Required data structure (Folders or Chats) not found in studentChat.json');
        }
        const folders = json.Folders;
        const chats = json.Chats;

        const hasChats = chats.some(chat => chat.folderId === id);
        if (hasChats) {
            res.status(400).send('Cannot delete folder because it contains chats');
            return;
        }

        const originalFolderCount = folders.length;
        json.Folders = folders.filter(folder => folder.id !== id);
        
        if (json.Folders.length === originalFolderCount) {
            return res.status(404).send('Folder not found to delete.');
        }


        fs.writeFile(studentChatPath, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error writing JSON file');
                return;
            }
            res.send('Folder deleted successfully from studentChat.json');
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
        if (!json.Folders || !json.Chats) {
            return res.status(404).send('Required data structure (Folders or Chats) not found in teacherChat.json');
        }
        const folders = json.Folders;
        const chats = json.Chats;

        const hasChats = chats.some(chat => chat.folderId === id);
        if (hasChats) {
            res.status(400).send('Cannot delete folder because it contains chats');
            return;
        }
        
        const originalFolderCount = folders.length;
        json.Folders = folders.filter(folder => folder.id !== id);

        if (json.Folders.length === originalFolderCount) {
            return res.status(404).send('Folder not found to delete.');
        }

        fs.writeFile(teacherChatPath, JSON.stringify(json, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error writing JSON file');
                return;
            }
            res.send('Folder deleted successfully from teacherChat.json');
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

// --- General Prompts (Function Cards) Children Prompts Management ---

// Add a child prompt to a General Prompt Folder
app.post('/api/general-prompts/folders/:folderId/prompts', async (req, res) => {
    const { folderId } = req.params;
    const { name, prompt: promptContent } = req.body; 

    if (!name || !promptContent) {
        return res.status(400).send('Prompt name and content are required.');
    }

    try {
        let generalPrompts = [];
        try {
            const data = await fs.promises.readFile(promptFunctionCardsPath, 'utf8');
            generalPrompts = JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') return res.status(404).send('Data file not found.');
            throw err;
        }

        const folderIndex = generalPrompts.findIndex(folder => folder.id === folderId);
        if (folderIndex === -1) {
            return res.status(404).send('Folder not found.');
        }

        const newPrompt = {
            id: uuidv4(),
            name,
            prompt: promptContent
        };

        if (!generalPrompts[folderIndex].children) {
            generalPrompts[folderIndex].children = [];
        }
        generalPrompts[folderIndex].children.push(newPrompt);

        await fs.promises.writeFile(promptFunctionCardsPath, JSON.stringify(generalPrompts, null, 2));
        res.status(201).json(newPrompt);
    } catch (error) {
        console.error('Failed to add child prompt:', error);
        res.status(500).send('Failed to save prompt data.');
    }
});

// Update a child prompt within a General Prompt Folder
app.put('/api/general-prompts/prompts/:promptId', async (req, res) => {
    const { promptId } = req.params;
    const { name, prompt: promptContent, folderId } = req.body; 

    if (!name || !promptContent || !folderId) {
        return res.status(400).send('Folder ID, prompt name, and content are required for update.');
    }

    try {
        let generalPrompts = [];
        try {
            const data = await fs.promises.readFile(promptFunctionCardsPath, 'utf8');
            generalPrompts = JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') return res.status(404).send('Data file not found.');
            throw err;
        }

        const folderIndex = generalPrompts.findIndex(folder => folder.id === folderId);
        if (folderIndex === -1) {
            return res.status(404).send('Parent folder not found.');
        }

        if (!generalPrompts[folderIndex].children) {
            return res.status(404).send('Prompt not found in the specified folder (no children array).');
        }
        
        const promptIndex = generalPrompts[folderIndex].children.findIndex(p => p.id === promptId);
        if (promptIndex === -1) {
            return res.status(404).send('Prompt not found in the specified folder.');
        }

        generalPrompts[folderIndex].children[promptIndex] = {
            ...generalPrompts[folderIndex].children[promptIndex],
            name,
            prompt: promptContent
        };

        await fs.promises.writeFile(promptFunctionCardsPath, JSON.stringify(generalPrompts, null, 2));
        res.status(200).json(generalPrompts[folderIndex].children[promptIndex]);
    } catch (error) {
        console.error('Failed to update child prompt:', error);
        res.status(500).send('Failed to update prompt data.');
    }
});

// Delete a child prompt from a General Prompt Folder
app.delete('/api/general-prompts/folders/:folderId/prompts/:promptId', async (req, res) => {
    const { folderId, promptId } = req.params;

    try {
        let generalPrompts = [];
        try {
            const data = await fs.promises.readFile(promptFunctionCardsPath, 'utf8');
            generalPrompts = JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') return res.status(404).send('Data file not found.');
            throw err;
        }

        const folderIndex = generalPrompts.findIndex(folder => folder.id === folderId);
        if (folderIndex === -1) {
            return res.status(404).send('Folder not found.');
        }

        if (!generalPrompts[folderIndex].children) {
             return res.status(404).send('Prompt not found (folder has no children).');
        }

        const originalLength = generalPrompts[folderIndex].children.length;
        generalPrompts[folderIndex].children = generalPrompts[folderIndex].children.filter(p => p.id !== promptId);

        if (generalPrompts[folderIndex].children.length === originalLength) {
            return res.status(404).send('Prompt not found in the specified folder.');
        }

        await fs.promises.writeFile(promptFunctionCardsPath, JSON.stringify(generalPrompts, null, 2));
        res.send('Child prompt deleted successfully.');
    } catch (error) {
        console.error('Failed to delete child prompt:', error);
        res.status(500).send('Failed to delete prompt data.');
    }
});


// Update order of child prompts within a General Prompt Folder
app.post('/api/general-prompts/folders/:folderId/prompts/order', async (req, res) => {
    const { folderId } = req.params;
    const { orderedPrompts } = req.body; 

    if (!Array.isArray(orderedPrompts)) {
        return res.status(400).send('Invalid data format: orderedPrompts should be an array.');
    }
    
    try {
        let generalPrompts = [];
        try {
            const data = await fs.promises.readFile(promptFunctionCardsPath, 'utf8');
            generalPrompts = JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') return res.status(404).send('Data file not found.');
            throw err;
        }

        const folderIndex = generalPrompts.findIndex(folder => folder.id === folderId);
        if (folderIndex === -1) {
            return res.status(404).send('Folder not found.');
        }
        generalPrompts[folderIndex].children = orderedPrompts;

        await fs.promises.writeFile(promptFunctionCardsPath, JSON.stringify(generalPrompts, null, 2));
        res.status(200).json({ message: 'Child prompts order updated successfully.' });
    } catch (error) {
        console.error('Failed to update child prompts order:', error);
        res.status(500).send('Failed to update prompts order.');
    }
});

// --- AppCard Prompts Management (from prompt.json) ---

// Get all AppCard Prompts 
app.get('/api/app-card-prompts', async (req, res) => {
    try {
        let appCardPromptsData = {};
        try {
            const appCardFileContent = await fs.promises.readFile(promptPath, 'utf8');
            const jsonData = JSON.parse(appCardFileContent);
            appCardPromptsData = jsonData.appCardPrompts || {};
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`prompt.json not found at ${promptPath}, returning empty appCardPrompts.`);
            } else {
                console.error('Error reading appCardPrompts from prompt.json:', err);
                return res.status(500).send('Error reading AppCard prompts data.');
            }
        }
        res.json(appCardPromptsData);
    } catch (error) {
        console.error('Failed to fetch AppCard prompts data:', error);
        res.status(500).send('Error fetching AppCard prompts data');
    }
});

// Add or Update an entire App Group's prompts in AppCard Prompts
app.post('/api/app-card-prompts/:appKey', async (req, res) => {
    const { appKey } = req.params;
    const promptsForApp = req.body; 

    if (!appKey || typeof promptsForApp !== 'object' || promptsForApp === null) {
        return res.status(400).send('App key and a valid prompts object are required.');
    }

    try {
        let jsonData = { appCardPrompts: {} }; 
        try {
            const fileContent = await fs.promises.readFile(promptPath, 'utf8');
            const parsedContent = JSON.parse(fileContent);
            if (parsedContent && typeof parsedContent.appCardPrompts === 'object' && parsedContent.appCardPrompts !== null) {
                jsonData.appCardPrompts = parsedContent.appCardPrompts;
            } else if (parsedContent && !parsedContent.appCardPrompts) {
                jsonData.appCardPrompts = {};
            } else if (!parsedContent) {
                jsonData.appCardPrompts = {};
            }
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }
        
        jsonData.appCardPrompts[appKey] = promptsForApp;

        let fullJsonData = { ...jsonData }; 
        try {
            const originalFileContent = await fs.promises.readFile(promptPath, 'utf8');
            const originalJson = JSON.parse(originalFileContent);
            fullJsonData = { ...originalJson, ...jsonData }; 
        } catch (err) {
            if (err.code !== 'ENOENT') console.warn("Could not merge with original prompt.json, proceeding with new/modified appCardPrompts structure.");
        }


        await fs.promises.writeFile(promptPath, JSON.stringify(fullJsonData, null, 2));
        res.status(200).json({ message: `AppCard prompts for '${appKey}' updated successfully.`, data: promptsForApp });
    } catch (error) {
        console.error(`Failed to update AppCard prompts for ${appKey}:`, error);
        res.status(500).send('Failed to update AppCard prompts.');
    }
});

// Delete an App Group from AppCard Prompts
app.delete('/api/app-card-prompts/:appKey', async (req, res) => {
    const { appKey } = req.params;

    try {
        let jsonData = {};
        try {
            const fileContent = await fs.promises.readFile(promptPath, 'utf8');
            jsonData = JSON.parse(fileContent);
        } catch (err) {
            if (err.code === 'ENOENT') return res.status(404).send('Prompt data file not found.');
            throw err;
        }

        if (!jsonData.appCardPrompts || !jsonData.appCardPrompts[appKey]) {
            return res.status(404).send(`App group '${appKey}' not found in AppCard prompts.`);
        }

        delete jsonData.appCardPrompts[appKey];

        await fs.promises.writeFile(promptPath, JSON.stringify(jsonData, null, 2));
        res.send(`App group '${appKey}' deleted successfully from AppCard prompts.`);
    } catch (error) {
        console.error(`Failed to delete AppCard prompt group ${appKey}:`, error);
        res.status(500).send('Failed to delete AppCard prompt group.');
    }
});

// Add/Update a specific prompt within an App Group in AppCard Prompts
app.post('/api/app-card-prompts/:appKey/prompts/:promptKey', async (req, res) => {
    const { appKey, promptKey } = req.params;
    const { content } = req.body; 

    if (!appKey || !promptKey || content === undefined) {
        return res.status(400).send('App key, prompt key, and content are required.');
    }

    try {
        let jsonData = { appCardPrompts: {} };
        try {
            const fileContent = await fs.promises.readFile(promptPath, 'utf8');
            const parsedContent = JSON.parse(fileContent);
            if (parsedContent && typeof parsedContent.appCardPrompts === 'object' && parsedContent.appCardPrompts !== null) {
                jsonData.appCardPrompts = parsedContent.appCardPrompts;
            } else if (parsedContent && !parsedContent.appCardPrompts) {
                jsonData.appCardPrompts = {};
            } else if (!parsedContent) {
                jsonData.appCardPrompts = {};
            }
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }
        
        if (!jsonData.appCardPrompts[appKey]) jsonData.appCardPrompts[appKey] = {};
        
        jsonData.appCardPrompts[appKey][promptKey] = content;
        
        let fullJsonData = { ...jsonData };
        try {
            const originalFileContent = await fs.promises.readFile(promptPath, 'utf8');
            const originalJson = JSON.parse(originalFileContent);
            fullJsonData = { ...originalJson, ...jsonData };
        } catch (err) {
            if (err.code !== 'ENOENT') console.warn("Could not merge with original prompt.json for specific prompt update.");
        }

        await fs.promises.writeFile(promptPath, JSON.stringify(fullJsonData, null, 2));
        res.status(200).json({ message: `Prompt '${promptKey}' in App '${appKey}' updated.`, content });
    } catch (error) {
        console.error(`Failed to update prompt '${promptKey}' in App '${appKey}':`, error);
        res.status(500).send('Failed to update AppCard prompt.');
    }
});


// Delete a specific prompt from an App Group in AppCard Prompts
app.delete('/api/app-card-prompts/:appKey/prompts/:promptKey', async (req, res) => {
    const { appKey, promptKey } = req.params;

    try {
        let jsonData = {};
        try {
            const fileContent = await fs.promises.readFile(promptPath, 'utf8');
            jsonData = JSON.parse(fileContent);
        } catch (err) {
            if (err.code === 'ENOENT') return res.status(404).send('Prompt data file not found.');
            throw err;
        }

        if (!jsonData.appCardPrompts || !jsonData.appCardPrompts[appKey] || jsonData.appCardPrompts[appKey][promptKey] === undefined) {
            return res.status(404).send(`Prompt '${promptKey}' not found in app group '${appKey}'.`);
        }

        delete jsonData.appCardPrompts[appKey][promptKey];

        if (Object.keys(jsonData.appCardPrompts[appKey]).length === 0) {
            // delete jsonData.appCardPrompts[appKey]; 
        }

        await fs.promises.writeFile(promptPath, JSON.stringify(jsonData, null, 2));
        res.send(`Prompt '${promptKey}' deleted from app group '${appKey}' successfully.`);
    } catch (error) {
        console.error(`Failed to delete AppCard prompt '${promptKey}' from ${appKey}:`, error);
        res.status(500).send('Failed to delete AppCard prompt.');
    }
});

// --- General Prompts (Function Cards) Folder Management ---

// Add a new General Prompt Folder (Top-level card)
app.post('/api/general-prompts/folders', async (req, res) => {
    const { name, icon, description } = req.body; 

    if (!name) {
        return res.status(400).send('Folder name is required');
    }

    try {
        let generalPrompts = [];
        try {
            const data = await fs.promises.readFile(promptFunctionCardsPath, 'utf8');
            generalPrompts = JSON.parse(data);
        } catch (err) {
            if (err.code !== 'ENOENT') throw err; 
        }

        const newFolder = {
            id: uuidv4(),
            name,
            icon: icon || '', 
            description: description || '', 
            children: [] 
        };
        generalPrompts.push(newFolder);

        await fs.promises.writeFile(promptFunctionCardsPath, JSON.stringify(generalPrompts, null, 2));
        res.status(201).json(newFolder);
    } catch (error) {
        console.error('Failed to add general prompt folder:', error);
        res.status(500).send('Failed to save folder data');
    }
});

// Update a General Prompt Folder
app.put('/api/general-prompts/folders/:folderId', async (req, res) => {
    const { folderId } = req.params;
    const { name, icon, description } = req.body;

    if (!name) {
        return res.status(400).send('Folder name is required');
    }

    try {
        let generalPrompts = [];
        try {
            const data = await fs.promises.readFile(promptFunctionCardsPath, 'utf8');
            generalPrompts = JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') return res.status(404).send('Data file not found.');
            throw err;
        }
        
        const folderIndex = generalPrompts.findIndex(folder => folder.id === folderId);
        if (folderIndex === -1) {
            return res.status(404).send('Folder not found');
        }

        generalPrompts[folderIndex] = {
            ...generalPrompts[folderIndex],
            name,
            icon: icon !== undefined ? icon : generalPrompts[folderIndex].icon,
            description: description !== undefined ? description : generalPrompts[folderIndex].description,
        };

        await fs.promises.writeFile(promptFunctionCardsPath, JSON.stringify(generalPrompts, null, 2));
        res.status(200).json(generalPrompts[folderIndex]);
    } catch (error) {
        console.error('Failed to update general prompt folder:', error);
        res.status(500).send('Failed to update folder data');
    }
});

// Delete a General Prompt Folder
app.delete('/api/general-prompts/folders/:folderId', async (req, res) => {
    const { folderId } = req.params;

    try {
        let generalPrompts = [];
        try {
            const data = await fs.promises.readFile(promptFunctionCardsPath, 'utf8');
            generalPrompts = JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') return res.status(404).send('Data file not found.');
            throw err;
        }

        const folderIndex = generalPrompts.findIndex(folder => folder.id === folderId);
        if (folderIndex === -1) {
            return res.status(404).send('Folder not found');
        }

        if (generalPrompts[folderIndex].children && generalPrompts[folderIndex].children.length > 0) {
            return res.status(400).send('Cannot delete folder because it contains prompts. Please delete the prompts first.');
        }

        generalPrompts.splice(folderIndex, 1); 

        await fs.promises.writeFile(promptFunctionCardsPath, JSON.stringify(generalPrompts, null, 2));
        res.send('General prompt folder deleted successfully');
    } catch (error) {
        console.error('Failed to delete general prompt folder:', error);
        res.status(500).send('Failed to delete folder data');
    }
});

// Update order of General Prompt Folders
app.post('/api/general-prompts/folders/order', async (req, res) => {
    const { orderedFolders } = req.body; 

    if (!Array.isArray(orderedFolders)) {
        return res.status(400).send('Invalid data format: orderedFolders should be an array.');
    }

    try {
        await fs.promises.writeFile(promptFunctionCardsPath, JSON.stringify(orderedFolders, null, 2));
        res.status(200).json({ message: 'General prompt folders order updated successfully' });
    } catch (error) {
        console.error('Failed to update general prompt folders order:', error);
        res.status(500).send('Failed to update folders order');
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

    fs.writeFile(helpPath, JSON.stringify(newData, null, 2), (err) => { 
        if (err) {
            console.error(err);
            res.status(500).send('Error updating data: ' + err.message); 
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

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3002'] 
}));

// ######## 卡片管理接口 ########

app.post('/addCard', (req, res) => {
    const { folderKey, cardData } = req.body; 

    if (!folderKey || !cardData || !cardData.cardId || !cardData.name || !cardData.difyConfig || !cardData.difyConfig.apiKey) {
        return res.status(400).send('Missing required fields: folderKey, cardId, name, difyConfig.apiKey.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading data file'); }

        try {
            const jsonData = JSON.parse(data);

            if (!jsonData[folderKey]) {
                return res.status(404).send('Target folder not found');
            }

            if (!jsonData[folderKey].cards || !Array.isArray(jsonData[folderKey].cards)) {
                jsonData[folderKey].cards = [];
            }

            const cardExists = jsonData[folderKey].cards.some(card => card.cardId === cardData.cardId);
            if (cardExists) {
                return res.status(409).send('Card with this ID already exists in the folder'); 
            }

            const newCard = {
                cardId: cardData.cardId,
                name: cardData.name,
                iconName: cardData.iconName || "", 
                difyConfig: {
                    apiKey: cardData.difyConfig.apiKey,
                    apiUrl: cardData.difyConfig.apiUrl || 'https://api.dify.ai/v1' 
                }
            };

            jsonData[folderKey].cards.push(newCard);

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

app.post('/updateCard', (req, res) => {
    const { folderKey, cardId, cardData } = req.body; 

    if (!folderKey || !cardId || !cardData || !cardData.name || !cardData.difyConfig || !cardData.difyConfig.apiKey) {
        return res.status(400).send('Missing required fields for update.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading data file'); }

        try {
            const jsonData = JSON.parse(data);

            if (!jsonData[folderKey] || !jsonData[folderKey].cards || !Array.isArray(jsonData[folderKey].cards)) {
                return res.status(404).send('Target folder or cards array not found');
            }

            const cardIndex = jsonData[folderKey].cards.findIndex(card => card.cardId === cardId);
            if (cardIndex === -1) {
                return res.status(404).send('Card not found in the folder');
            }

            const updatedCard = {
                cardId: cardId, 
                name: cardData.name,
                iconName: cardData.iconName || "",
                difyConfig: {
                    apiKey: cardData.difyConfig.apiKey,
                    apiUrl: cardData.difyConfig.apiUrl || 'https://api.dify.ai/v1'
                }
            };

            jsonData[folderKey].cards[cardIndex] = updatedCard;

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

app.post('/deleteCard', (req, res) => {
    const { folderKey, cardId } = req.body;

    if (!folderKey || !cardId) {
        return res.status(400).send('Missing required fields: folderKey, cardId.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading data file'); }

        try {
            const jsonData = JSON.parse(data);

            if (!jsonData[folderKey] || !jsonData[folderKey].cards || !Array.isArray(jsonData[folderKey].cards)) {
                return res.status(404).send('Target folder or cards array not found');
            }

            const cardIndex = jsonData[folderKey].cards.findIndex(card => card.cardId === cardId);
            if (cardIndex === -1) {
                return res.status(404).send('Card not found in the folder');
            }

            jsonData[folderKey].cards.splice(cardIndex, 1);

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

app.post('/updateFolder', (req, res) => {
    const { originalKey, displayName, apiUrl, difyConfig } = req.body;

    if (!originalKey || !displayName || displayName.trim() === "") {
        return res.status(400).send('Original key and display name are required.');
    }

    fs.readFile(dify_keys, 'utf8', (err, data) => {
        if (err) { 
            console.error("Error reading dify_keys.json for updateFolder:", err);
            return res.status(500).send('Error reading data file'); 
        }

        try {
            const jsonData = JSON.parse(data);

            if (!jsonData[originalKey]) {
                return res.status(404).send('Folder not found');
            }

            jsonData[originalKey].displayName = displayName.trim();

            if (originalKey === 'global') {
                if (apiUrl !== undefined) { 
                   jsonData[originalKey].apiUrl = apiUrl;
                   console.log(`Global apiUrl updated for key: ${originalKey} to: ${apiUrl}`);
                }
            }

            fs.writeFile(dify_keys, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) { 
                    console.error("Error writing dify_keys.json after updateFolder:", err);
                    return res.status(500).send('Error writing data file'); 
                }
                res.json({ success: true, message: 'Folder updated successfully', data: jsonData[originalKey] });
            });
        } catch (parseError) {
            console.error("Error processing dify_keys.json for updateFolder:", parseError);
            res.status(500).send('Error processing data file');
        }
    });
});

// ######## 全局模型管理接口 ########

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
                jsonData.global = { ...(jsonData.global || {}), models: [] }; 
            }

            const nameExists = jsonData.global.models.some(model => model.name === name);
            if (nameExists) {
                return res.status(409).send('Model with this name already exists.');
            }

            const newModel = {
                name: name,
                apiKey: apiKey,
                isDefault: !!isDefault 
            };

            if (newModel.isDefault) {
                jsonData.global.models.forEach(model => model.isDefault = false);
            }

            jsonData.global.models.push(newModel);

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

app.post('/updateGlobalModel', (req, res) => {
    const { originalName, newData } = req.body; 

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

            const modelIndex = jsonData.global.models.findIndex(model => model.name === originalName);
            if (modelIndex === -1) {
                return res.status(404).send('Model with original name not found.');
            }

            if (originalName !== newData.name) { 
                const newNameExists = jsonData.global.models.some((model, index) => index !== modelIndex && model.name === newData.name);
                if (newNameExists) {
                    return res.status(409).send('Another model with the new name already exists.');
                }
            }

            const updatedModel = {
                name: newData.name,       
                apiKey: newData.apiKey,   
                isDefault: !!newData.isDefault 
            };

            if (updatedModel.isDefault) {
                jsonData.global.models.forEach((model, index) => {
                    if (index !== modelIndex) {
                        model.isDefault = false;
                    }
                });
            } else {
                const currentDefault = jsonData.global.models.find((model, index) => index !== modelIndex && model.isDefault);
                if (!currentDefault && jsonData.global.models[modelIndex].isDefault && jsonData.global.models.length > 1) {
                     const newDefaultIndex = jsonData.global.models.findIndex((_, index) => index !== modelIndex);
                     if (newDefaultIndex !== -1) {
                         jsonData.global.models[newDefaultIndex].isDefault = true;
                     }
                } else if (jsonData.global.models.length === 1) {
                    updatedModel.isDefault = true;
                }
            }
            
            jsonData.global.models[modelIndex] = updatedModel;

             const hasDefault = jsonData.global.models.some(model => model.isDefault);
             if (!hasDefault && jsonData.global.models.length > 0) {
                 jsonData.global.models[0].isDefault = true;
             }

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

app.post('/deleteGlobalModel', (req, res) => {
    const { name } = req.body; 

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

            if (jsonData.global.models[modelIndex].isDefault) {
                return res.status(400).send('Cannot delete the default model.');
            }

            jsonData.global.models.splice(modelIndex, 1);

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

app.post('/setGlobalDefaultModel', (req, res) => {
    const { name } = req.body; 

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

app.get('/getMetadata', (req, res) => {
    fs.readFile(metadataJsonPath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.warn(`metadata.json not found at ${metadataJsonPath}, returning default structure.`);
                res.json({
                    title: '',
                    subtitle: '',
                    pageTitle: 'BistuCopilot', 
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

app.post('/updateMetadata', (req, res) => { 
    const newMetadata = req.body; 

    if (!newMetadata || 
        typeof newMetadata.title !== 'string' || 
        typeof newMetadata.subtitle !== 'string' || 
        typeof newMetadata.pageTitle !== 'string' || 
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
            Object.keys(allApps).forEach(folderKey => {
                if (folderKey !== 'global') {
                    const appData = allApps[folderKey];
                    availableApps[folderKey] = {
                        displayName: appData.displayName || folderKey,
                        cards: (appData.cards || []).map(card => ({ 
                            cardId: card.cardId,
                            name: card.name,
                            iconName: card.iconName
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
            if (err.code === 'ENOENT') {
                console.warn(`${path.basename(filePath)} not found, returning default structure with empty allowedApps and appDisplayOrder.`);
                return callback(null, { allowedApps: {}, appDisplayOrder: [] });
            }
            console.error(`Error reading ${path.basename(filePath)}:`, err);
            if (res) { 
                return res.status(500).send(`Error reading ${path.basename(filePath)}`);
            } else { 
                return callback(err);
            }
        }
        try {
            const jsonData = JSON.parse(data);
            if (typeof jsonData.allowedApps !== 'object' || jsonData.allowedApps === null) {
                 console.warn(`Invalid or missing allowedApps in ${path.basename(filePath)}. Defaulting to {}.`);
                 jsonData.allowedApps = {};
            }
            if (!Array.isArray(jsonData.appDisplayOrder)) {
                console.warn(`Invalid or missing appDisplayOrder in ${path.basename(filePath)}. Defaulting to [].`);
                jsonData.appDisplayOrder = [];
            }
            callback(null, jsonData);
        } catch (parseError) {
            console.error(`Error parsing ${path.basename(filePath)}:`, parseError);
            callback(null, { allowedApps: {}, appDisplayOrder: [] });
        }
    });
};

// GET /api/student-config: Reads studentChat.json
app.get('/api/student-config', (req, res) => {
    readConfigJson(studentChatPath, res, (err, data) => {
        if (err) {
            if (!res.headersSent) {
                 return res.status(500).send('Failed to read student configuration due to an internal error.');
            }
            return; 
        }
        res.json(data);
    });
});

// GET /api/teacher-config: Reads teacherChat.json
app.get('/api/teacher-config', (req, res) => {
    readConfigJson(teacherChatPath, res, (err, data) => {
        if (err) {
            if (!res.headersSent) {
                return res.status(500).send('Failed to read teacher configuration due to an internal error.');
            }
            return;
        }
        res.json(data);
    });
});

// Helper function to write config JSON safely
const writeConfigJson = (filePath, data, res, callback) => {
     if (
        typeof data !== 'object' || data === null ||
        typeof data.allowedApps !== 'object' || data.allowedApps === null ||
        !Array.isArray(data.appDisplayOrder) 
      ) {
        console.error(`Invalid data format received for ${path.basename(filePath)}: allowedApps must be an object and appDisplayOrder must be an array.`);
        return res.status(400).send(`Invalid data format for ${path.basename(filePath)}.`);
    }
    const dataToWrite = { 
        allowedApps: data.allowedApps,
        appDisplayOrder: data.appDisplayOrder 
    }; 

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
    if (newConfig && newConfig.allowedApps && !newConfig.appDisplayOrder) {
        console.warn("appDisplayOrder missing in update-student-config request, defaulting to empty array.");
        newConfig.appDisplayOrder = [];
    }
    writeConfigJson(studentChatPath, newConfig, res, () => {
        res.json({ success: true, message: 'Student configuration updated successfully.' });
    });
});

// POST /api/update-teacher-config: Writes to teacherChat.json
app.post('/api/update-teacher-config', (req, res) => {
    const newConfig = req.body;
    if (newConfig && newConfig.allowedApps && !newConfig.appDisplayOrder) {
        console.warn("appDisplayOrder missing in update-teacher-config request, defaulting to empty array.");
        newConfig.appDisplayOrder = [];
    }
    writeConfigJson(teacherChatPath, newConfig, res, () => {
        res.json({ success: true, message: 'Teacher configuration updated successfully.' });
    });
});

// ######## END NEW APIs ########

// 获取更新信息
app.get('/getUpdateInfo', (req, res) => {
    fs.readFile(updateInfoPath, 'utf8', (err, data) => {
        if (err) {
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
    
    if (!newUpdateInfo || 
        typeof newUpdateInfo.title !== 'string' || 
        !Array.isArray(newUpdateInfo.content)) {
        return res.status(400).json({
            success: false,
            message: '提供的更新信息数据格式无效或缺少必要字段'
        });
    }
    
    if (newUpdateInfo.version && !/^\d+\.\d+\.\d+$/.test(newUpdateInfo.version)) {
        return res.status(400).json({
            success: false,
            message: '版本号格式无效，请使用类似 1.0.0 的格式'
        });
    }
    
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
