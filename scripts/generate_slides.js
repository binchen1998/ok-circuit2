import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const slides = [
  {
    title: "ElectroLab AI - 智能电路仿真器",
    subtitle: "基于 Web 的可视化电路构建与实时仿真平台",
    content: [
      "汇报人: [您的名字]"
    ],
    type: "cover"
  },
  {
    title: "项目背景与目标",
    content: [
      "痛点分析:",
      "• 传统 SPICE 工具门槛高，操作复杂",
      "• 缺乏直观的电流动态展示",
      "• 缺少实时的错误反馈",
      "",
      "项目目标:",
      "• 打造低门槛、可视化的 Web 模拟器",
      "• 集成 AI (Gemini) 辅助教学",
      "• 支持中英双语，服务全球"
    ]
  },
  {
    title: "核心功能概览",
    content: [
      "1. 拖拽式电路构建: 丰富元件库，SVG 交互画布",
      "2. 实时物理仿真: 参数修改即时计算",
      "3. 动态可视化: 电子流向动画，灯泡亮度模拟",
      "4. AI 智能助手: Gemini 模型实时答疑",
      "5. 多语言支持: 一键中英切换"
    ]
  },
  {
    title: "技术架构",
    content: [
      "前端: React 18 + TypeScript + Vite",
      "样式: Tailwind CSS",
      "核心模块:",
      "• UI: CircuitCanvas (SVG), Toolbar",
      "• 逻辑: App.tsx (状态管理)",
      "• 计算: solver.ts (MNA 算法)",
      "• 服务: geminiService.ts"
    ]
  },
  {
    title: "核心算法 - MNA 求解器",
    content: [
      "Modified Nodal Analysis (改进节点分析法):",
      "• 构建线性方程组 Ax = Z",
      "• A: 电导矩阵, x: 节点电压, Z: 独立源",
      "• 高斯消元法求解",
      "",
      "瞬态分析 (Transient Analysis):",
      "• 对象: 电容 (C), 电感 (L)",
      "• 方法: 后向欧拉法 (Backward Euler)",
      "• 将储能元件等效为电阻+电流源模型"
    ]
  },
  {
    title: "可视化实现细节",
    content: [
      "SVG 渲染引擎:",
      "• React 状态驱动 SVG 属性更新",
      "• 高性能矢量绘制",
      "",
      "电子流动画:",
      "• 黄色粒子沿路径移动",
      "• 速度与电流大小成正比: dur = 1 / (I * 5)",
      "",
      "物理循环:",
      "• requestAnimationFrame 驱动仿真步进"
    ]
  },
  {
    title: "AI 赋能 - 智能助手",
    content: [
      "上下文感知:",
      "• 序列化当前电路拓扑 (JSON)",
      "",
      "交互流程:",
      "1. 用户提问 ('灯泡为什么不亮?')",
      "2. 发送: 问题 + 电路数据 -> Gemini API",
      "3. AI 分析并返回解释 ('开关 S1 断开了...')"
    ]
  },
  {
    title: "国际化 (i18n) 设计",
    content: [
      "架构:",
      "• 字典文件: utils/i18n.ts",
      "• Context: 全局语言状态管理",
      "• Hook: useLanguage() 提供 t() 函数",
      "",
      "优势:",
      "• 轻量级，无额外依赖",
      "• TypeScript 类型安全保证"
    ]
  },
  {
    title: "局限性与未来展望",
    content: [
      "当前局限:",
      "• 仅支持线性元件 (无二极管/晶体管)",
      "• 仅支持时域分析",
      "",
      "未来规划:",
      "• 引入非线性求解器 (牛顿迭代法)",
      "• 添加示波器功能",
      "• 云端存储与分享"
    ]
  },
  {
    title: "总结",
    content: [
      "ElectroLab AI:",
      "• 技术: 完整覆盖数学求解到 UI 渲染",
      "• 体验: 可视化 + AI 降低学习门槛",
      "• 架构: 模块清晰，易于扩展"
    ],
    type: "summary"
  },
  {
    title: "谢谢大家",
    subtitle: "Q & A",
    content: [
      "GitHub Repo: [Link]",
      "Live Demo: [Link]"
    ],
    type: "cover"
  }
];

function generateSVG(slide, index) {
  const width = 1280;
  const height = 720;
  const bgColors = ["#f8fafc", "#eff6ff", "#f0f9ff"];
  const bgColor = bgColors[index % 3];
  
  let svgContent = `
    <rect width="100%" height="100%" fill="${bgColor}"/>
    <rect width="100%" height="15" fill="#3b82f6"/>
    <rect y="705" width="100%" height="15" fill="#3b82f6"/>
  `;

  // Header / Logo
  svgContent += `
    <g transform="translate(40, 50)">
       <rect width="40" height="40" rx="8" fill="#2563eb"/>
       <text x="20" y="28" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="24">⚡</text>
       <text x="50" y="28" fill="#1e40af" font-family="Arial" font-weight="bold" font-size="24">ElectroLab AI</text>
    </g>
    <text x="${width - 40}" y="50" text-anchor="end" fill="#94a3b8" font-family="Arial" font-size="16">${index + 1} / ${slides.length}</text>
  `;

  if (slide.type === 'cover') {
    svgContent += `
      <g transform="translate(${width/2}, ${height/2})">
        <text y="-40" text-anchor="middle" fill="#1e3a8a" font-family="Arial" font-weight="bold" font-size="64">${slide.title}</text>
        ${slide.subtitle ? `<text y="40" text-anchor="middle" fill="#3b82f6" font-family="Arial" font-size="32">${slide.subtitle}</text>` : ''}
        <g transform="translate(0, 120)">
           ${slide.content.map((line, i) => `<text y="${i * 40}" text-anchor="middle" fill="#475569" font-family="Arial" font-size="24">${line}</text>`).join('')}
        </g>
      </g>
    `;
  } else {
    svgContent += `
      <g transform="translate(80, 150)">
        <text y="0" fill="#1e3a8a" font-family="Arial" font-weight="bold" font-size="48">${slide.title}</text>
        <line x1="0" y1="30" x2="${width - 160}" y2="30" stroke="#bfdbfe" stroke-width="2"/>
        
        <g transform="translate(20, 80)">
          ${slide.content.map((line, i) => {
            const isHeader = !line.startsWith('•') && !line.startsWith('1.') && !line.startsWith('2.') && !line.startsWith('3.') && !line.startsWith('4.') && !line.startsWith('5.') && line.trim() !== '' && !line.includes(':');
            const fontSize = isHeader ? 32 : 28;
            const fill = isHeader ? "#1d4ed8" : "#334155";
            const fontWeight = isHeader ? "bold" : "normal";
            const yPos = i * 50;
            
            // Simple indentation for bullets
            let xPos = 0;
            if (line.startsWith('•')) xPos = 20;

            return `<text x="${xPos}" y="${yPos}" fill="${fill}" font-family="Arial" font-weight="${fontWeight}" font-size="${fontSize}">${line}</text>`;
          }).join('')}
        </g>
      </g>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    ${svgContent}
  </svg>`;
}

slides.forEach((slide, index) => {
  const fileName = `slide_${(index + 1).toString().padStart(2, '0')}.svg`;
  const filePath = path.join(__dirname, '../slides', fileName);
  fs.writeFileSync(filePath, generateSVG(slide, index));
  console.log(`Generated ${fileName}`);
});

