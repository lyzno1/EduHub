import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { UpdateInfo } from '@/utils/app/updateInfo'; // 仅导入类型

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: '仅支持GET请求' });
    }

    // 直接在API路由中读取文件
    const filePath = path.join(process.cwd(), 'public', 'config', 'update-info.json');
    let updateInfo: UpdateInfo | null = null;

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      updateInfo = JSON.parse(content);
    } else {
      console.warn(`Update info file not found at: ${filePath}`);
      return res.status(404).json({ error: '更新信息文件未找到' });
    }
    
    // 检查文件内容是否有效
    if (!updateInfo || !updateInfo.content || updateInfo.content.length === 0) {
        console.warn('Update info file is empty or invalid.');
        return res.status(404).json({ error: '更新信息内容无效' });
    }
    
    return res.status(200).json(updateInfo);
  } catch (error) {
    console.error('读取更新信息文件时出错:', error);
    return res.status(500).json({ error: '服务器读取文件错误' });
  }
} 