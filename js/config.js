/**
 * DW 预约系统 - 配置文件
 * Supabase 后端连接参数与应用配置
 */

const CONFIG = {
    // Supabase 后端凭证
    SUPABASE_URL: 'https://umciusmfajnkkmsbvepy.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_bpL7qUdRgtBH38jPUo0q0Q_I-wUNKne',
    TABLE: 'bookings',

    // 管理员密码
    ADMIN_PWD: '123admin',

    // 日历显示天数
    DAYS_AHEAD: 30
};

// 时间段定义
const TIME_SLOTS = [
    { key: 'lunch',     label: '午餐', icon: '🍽️', time: '11:00-13:00' },
    { key: 'afternoon', label: '下午', icon: '☕', time: '14:00-17:00' },
    { key: 'dinner',    label: '晚餐', icon: '🌙', time: '17:00-20:00' },
    { key: 'night',     label: '夜间', icon: '🍷', time: '20:00-23:00' }
];

// 中文星期与月份
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
