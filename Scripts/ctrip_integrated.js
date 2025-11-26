/*
 * 携程 App 签到集成脚本 (Quantumult X 适用)
 * 作用: 
 * 1. 作为重写脚本 (script-request-header) 时，用于获取并保存 Cookie。
 * 2. 作为定时任务脚本 (task-local/remote) 时，用于读取 Cookie 并执行签到。
 */

const cookieName = '携程 App 签到';
const cookieKey = 'cookie_ctrip';
const isRequest = typeof $request !== 'undefined'; // 判断是否为重写请求触发

// 检查是否在 Quantumult X 环境
if (typeof $task === 'undefined' || !$task.is) {
    console.log(`[${cookieName}] 脚本未在 Quantumult X 环境运行`);
    $done();
}

if (isRequest) {
    // --- 模式 1: Cookie 获取 ---
    const cookieVal = $request.headers['Cookie'];

    if (cookieVal) {
        const success = $prefs.setValueForKey(cookieVal, cookieKey);

        if (success) {
            $notify(cookieName, '获取 Cookie 成功', `Cookie: ${cookieVal.substring(0, 30)}...`);
            console.log(`[${cookieName}] 获取 Cookie 成功: ${cookieVal}`);
        } else {
            $notify(cookieName, '获取 Cookie 失败', '请检查 Quantumult X 配置或权限');
            console.log(`[${cookieName}] 获取 Cookie 失败`);
        }
    } else {
        $notify(cookieName, '获取 Cookie 失败', '请求头中未找到 Cookie');
        console.log(`[${cookieName}] 请求头中未找到 Cookie`);
    }
    $done({});
} else {
    // --- 模式 2: 每日签到任务 ---
    const cookieVal = $prefs.valueForKey(cookieKey);

    if (!cookieVal) {
        $notify(cookieName, '签到失败', '未找到携程 Cookie，请先抓包获取');
        console.log(`[${cookieName}] 签到失败: 未找到携程 Cookie`);
        $done();
    }

    function sign() {
        const url = {
            url: 'https://m.ctrip.com/restapi/soa2/14946/json/saveDailyBonus?',
            method: 'GET',
            headers: {
                'Origin': 'https://m.ctrip.com',
                'Connection': 'keep-alive',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Host': 'm.ctrip.com',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 mediaCode=SFEXPRESSAPP-IOS-ML',
                'Accept-Language': 'zh-cn',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://m.ctrip.com/webapp/membercenter/task?isHideNavBar=YES&from_native_page=1',
                'Cookie': cookieVal
            }
        };

        $task.fetch(url).then(response => {
            const title = cookieName;
            let subTitle = '签到结果: 未知';
            let detail = '';

            try {
                const data = JSON.parse(response.body);
                if (data.resultcode === 0) {
                    subTitle = `签到成功: 积分 ${data.result.integrated}`;
                    detail = `下次可获得: ${data.result.nextIntegrated}`;
                } else {
                    subTitle = '签到失败';
                    detail = `说明: ${data.resultmessage}`;
                }
            } catch (e) {
                subTitle = '签到失败';
                detail = `响应解析错误: ${e.message}`;
                console.log(`[${cookieName}] 响应: ${response.body}`);
            }

            $notify(title, subTitle, detail);
            console.log(`[${cookieName}] ${subTitle} - ${detail}`);
            $done();
        }, reason => {
            $notify(cookieName, '签到失败', `网络请求错误: ${reason.error}`);
            console.log(`[${cookieName}] 签到失败: 网络请求错误: ${reason.error}`);
            $done();
        });
    }

    sign();
}
