/**
 * 关于信息配置文件
 * 可以在此文件中配置系统的"关于"信息，包括版本号、版权信息等
 */

export interface AboutConfig {
  // 显示在tooltip中的内容
  tooltipContent: string;
  // 版本信息
  version: string;
  // 版权信息
  copyright: string;
  // 其他可能需要的信息
  additionalInfo?: Record<string, string>;
}

const aboutConfig: AboutConfig = {
  tooltipContent: 'EduHub v1.0 - 智能教育助手\n北京信息科技大学智能系统实验室',
  version: 'v1.0.0',
  copyright: '© 2023-2024 北京信息科技大学',
  additionalInfo: {
    developer: '智能系统实验室',
    website: 'https://iflab.org'
  }
};

export default aboutConfig;