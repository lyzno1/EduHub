import React from 'react';
// import ReactDOM from 'react-dom'; // 不再需要直接导入 ReactDOM
import { createRoot } from 'react-dom/client'; // 导入 createRoot
import './index.css';
import { RouterProvider } from "react-router-dom";
import router from "./router";
import { AuthProvider } from './context/AuthContext';

// 1. 获取根 DOM 元素
const container = document.getElementById('root');

// 2. 使用 createRoot 创建根
const root = createRoot(container); // container 不能为 null

// 3. 使用 root.render 渲染应用
root.render(
    <React.StrictMode>
        <AuthProvider>
            <RouterProvider router={router}/>
        </AuthProvider>
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals

