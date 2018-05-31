const fs = require('fs');
const http = require('http');
const config = require('./data/config');
const branch = config.branch;
const tag = config.tag; //标签
//禅道的登录名和密码
const loginData = {
    account: config.account,
    password: config.password
};
var host = config.host;
const todayTimeStamp = new Date(new Date().toLocaleDateString()).getTime(); //今天的时间戳
//console.debug('todaytimeStamp:', todayTimeStamp);//13位的时间戳
let lines = fs.readLines("../.git/logs/refs/heads/"+branch); //读取git日志文件
let content = lines[0];
let commits = [];
let rows = content.split('\n');
let reg1 = /> (\d+) \+0800/i; //匹配时间戳正则
let reg2 = /commit(\s\(merge\))?: (.*)/i; //匹配commit内容,包括合并内容正则

//遍历每行日志,获取今日提交内容,放入commit
rows.forEach((row, index, array)=>{
    let match1 = reg1.exec(row);
    let match2 = reg2.exec(row);
    if(match2) { //过滤commit以外的操作
        if (match1[1] < todayTimeStamp / 1000) { //过滤非今日commit
            return true; //foreach中的continue使用return 代替
        }
        else {
            let datetime = timestampToDateTimeStr(match1[1]).split(' ');
            let date = datetime[0]; //日期
            let time = datetime[1]; //时间

            //拼装今日用于提交的日志
            let line = {
                date: date,
                time: time,
                tag: tag,
                content: match2[2]
            };
            commits.push(line);
        }
    }
});

if(commits.length>0){
	let commitContent = JSON.stringify(commits);
	fs.writeTextFile("./data/log/"+todayTimeStamp/1000+".cm", commitContent);
}else{
	console.log("今日无 commit 内容");
}

http.userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36';
//登录禅道系统
let resp = http.post('http://'+host+'/index.php?m=user&f=login', {
        body: loginData,
        headers: {
            Referer: 'http://'+host+'/index.php?m=worklog&f=index',
            "Content-Type": 'application/x-www-form-urlencoded; charset=UTF-8',
            //'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
            //'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
            //'Cache-Control': 'no-cache',
            //Connection: 'keep-alive',
            //Accept: 'application/json, text/javascript, */*; q=0.01',
            //Cookies: 'lang=zh-cn; device=desktop; theme=default; zentaosid=t7ol99e188ju4b9ntsg1qmo2d4;ajax_lastNext=on'
        }
    });
let html = resp.body.read().toString();
//console.log(resp.statusCode, resp.statusMessage);
if(resp.statusCode == 200) {
    if (html.includes('parent.location=\'/index.php?m=index&f=index\'')) {
        console.log('Successfully Login');
    } else {
        let matches = /alert\('([^']+)'\)/.exec(html);
        let errMsg = matches ? matches[1] : html;
        console.error('Login Error:', errMsg);
    }
} else {
    console.error('Login Error: ', resp.statusCode, resp.statusMessage);
}

var response;
//DONE; 提交日志内容
//TODO; 处理结果
commits.forEach((row,index,array) => {
    console.log(row);
    response = http.post(
        // 'http://'+host+'/index.php?m=worklog&f=add',
        'http://'+host+'/index.php?m=worklog&f=add',
        {

            body:row,

            headers: {
                Referer :'http://'+ host+'/index.php?m=worklog&f=index',
                "Contet-Type": 'application/x-www-form-urlencoded; charset=UTF-8',
            }

        }
    ) ;
});
	// var response = http.post(
	//     'http://'+host+'/index.php?m=worklog&f=add',
	//    {
	//    	// query:{
	//    	// 	content: "moni1",
	//    	// 	date: "2018-05-30",
	// 		// tag: "moni",
	// 		// time: "18:00:05"
	//    	// },
	//    	body:{
	//    		content: "moni1",
	//    		date: "2018-05-30",
	// 		tag: "moni",
	// 		time: "18:00:05"
	//    	},
   //
	//     headers: {
	//     	Referer : ''+host+'/index.php?m=worklog&f=index',
	//     	"Contet-Type": 'application/x-www-form-urlencoded; charset=UTF-8',
	//     }
   //
	//    }
   // ) ;

console.log('res',response.toString());

// console.log(JSON.stringify(response));
function timestampToDateTimeStr(timestamp) {
    let date = new Date(timestamp * 1000);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
    let Y = date.getFullYear() + '-';
    let M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    let D = date.getDate() + ' ';
    let h = date.getHours() + ':';
    let m = date.getMinutes() + ':';
    let s = date.getSeconds();
    return Y + M + D + h + m + s;
}