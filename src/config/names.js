/**
 * 姓名配置（Base64 编码，防止源码直接暴露）
 * 在代码中按需解码使用，不影响页面显示
 */

const $ = s => decodeURIComponent(escape(atob(s)));

export const SHORT_NAME   = $('5bCP6ZmG');        // 小陆
export const FULL_NAME    = $('6ZmG5L2z55Cq');    // 陆佳琪
export const ENGLISH_NAME = $('SmlhcWk=');        // Jiaqi

export const TITLE_TEXT   = $('54us5bGe5LqO5bCP6ZmG5ZCM5a2m55qE5aSn5a2m5q+V5Lia56Wd6LS6'); // 独属于小陆同学的大学毕业祝贺
