var fs = require("fs");
var http = require("http");
var path = require("path");
var qs = require('querystring')
var zmq = require("zmq"); 
var protobuf = require('protobuf.js');
var proto2json = require('proto2json');
var authen = require("./authen");
var sessionMgr = require("./sessionManager");
var dataMgr = require("./dataManager");

/*zeromq和protobuf变量初始化*/
var socket = zmq.socket("req"); //req,push
var zmqport = 9998;

var loginauthen = new authen(); //用户登录鉴权对象
var sessionManager = new sessionMgr();
var dataMgr = new dataMgr();

var port = process.env.PORT || 80;
if (process.argv.length == 3) {
    port = process.argv[2];
}
var PAGECOUNT = 10;  //每页记录

var serverDir = path.dirname(__filename)
var clientDir = path.join(serverDir, "client/");

var contentTypeMap = {
    ".html": "text/html;charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css"
};

function logToConsole (message) {  
    console.log("[" + new Date().toLocaleTimeString() + "] " + message);
}

var server = http.createServer(function (request, response) {
    var headers = {
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
        "Expires": "0"
    };

    /*post类型的请求都是AJAX命令，get类型的请求都是请求页面*/
    if(request.method == 'POST')
	  {
        var parts = request.url.split("/");
        logToConsole("coming AJAX url:" + request.url);
	
	    var command = null;
	    var commandBody = ""; //从POST 请求中获取，为字符串
	    if((parts[1] != null)&& (parts[1]!=""))
	    { //获取URL中的命令并处理
	        command = parts[1];
			request.on("data", function (data) { commandBody += data; });
			request.on("end", function () {
				  switch(command)
				  {
				   case 'login': //post
				   commandParams = qs.parse(commandBody) ;
				   handleLoginReq(response,commandParams,loginauthen);
				   break;
				   
				   case 'checkSession': //post
				   commandParams = JSON.parse(commandBody) ;
				   handlecheckSessionReq(response,commandParams);
				   break;
				   
				   case 'listPageDevices': //post
				   commandParams = JSON.parse(commandBody) ;
				   handleListPageReq(response,commandParams);
				   break;
				   
				   case 'registerDevices': //post
				   commandParams = JSON.parse(commandBody) ;
				   handleRegisterDevices(response,commandParams);
				   break;
				   
				   case 'unregisterDevices': //post
				   commandParams = JSON.parse(commandBody) ;
				   handleunRegisterDevices(response,commandParams);
				   break;
				   
				   case 'delDiscoveredDevices': //post
				   commandParams = JSON.parse(commandBody) ;
				   handleDelDiscoveredDevices(response,commandParams);
				   break;
				   
				   case 'invokeWsInterface': //post
				   commandParams = JSON.parse(commandBody) ;
				   handleInvokeWsInterface(response,commandParams);
				   break;
				   
				   case 'getStreamUri': //post
				   commandParams = JSON.parse(commandBody) ;
				   handleGetStreamUri(response,commandParams);
				   break;
				   
				   default:
				   logToConsole('unknown command:' + command);
				   response.writeHead(404);
                   response.end("404 Not found");
				   break;
				  }
			});
		}
		return;
	}//endif post

    var url = request.url.split("?", 1)[0];
    var filePath = path.join(clientDir, url);
    if (filePath.indexOf(clientDir) != 0 || filePath == clientDir)
        filePath = path.join(clientDir, "/login.html");

    fs.stat(filePath, function (err, stats) {
        if (err || !stats.isFile()) {
            response.writeHead(404);
            response.end("404 Not found");
            return;
        }

        var contentType = contentTypeMap[path.extname(filePath)] || "text/plain";
        response.writeHead(200, { "Content-Type": contentType });

        var readStream = fs.createReadStream(filePath);
        readStream.on("error", function () {
            response.writeHead(500);
            response.end("500 Server error");
        });
        readStream.pipe(response);
    });
});

/*初始化ZMQ*/
function initZMQ(zmqPort)
{
	socket.connect('tcp://127.0.0.1:'+zmqPort); 
	socket.on("message", function (message) {  
		logToConsole("ZMQ Response: " + message.toString("utf8"));
    });
}

logToConsole('The server is listening on port ' + port);
server.listen(port);
initZMQ(zmqport);

/*-------------------------------函数定义----------------------------*/
/* zeromq 的消息发送函数 */
function sendZmqMessage (message) {  
    logToConsole("ZMQ Sending: " + message.toString());
    socket.send(message);
}

/* 根据protobuf的schema构建发送的数据对象*/
function constructPBMsg(msgname,msgobject)
{
	var msg = translator.encode(msgname, msgobject);
	//var decoded = translator.decode('BufTest', msg);
	//logToConsole("decoded.payload : "+decoded.payload.toString());
	return msg;
}

/*处理 login请求*/
function handleLoginReq(res,cp,la)
{
   var result = false;
   //res.writeHead(200, { "Content-Type": "text/plain" });
   if(('username' in cp)&&('password' in cp))
   {
	   la.username = cp.username;
	   la.password = cp.password;
	   result = la.loginAuthen();
   }
   
   if(result)
   {
	    var currdate = new Date(); 
		var sessionid = currdate.toLocaleTimeString()+":"+currdate.getMilliseconds();
		res.writeHead(302, {
       'Location': '/onvifDevMgr.html?'+sessionid
        //add other headers here...
        });
		//登录成功将currdate.toLocaleTimeString()作为sessionId放入到session管理器中
		if(!sessionManager.addSession(sessionid,{
			username:cp.username
			}))
		  {
			logToConsole("sessionManager.addSession fail:" + sessionid);		
		  }
	}else
	{
		res.writeHead(302, {
       'Location': '/login.html?error'
        //add other headers here...
        });
	}
    res.end();
	/*发送zmq消息，测试用
	var msgobj = { num: 42, payload: new Buffer("Hello World1") };
	socket.send(constructPBMsg('BufTest',msgobj),zmq.ZMQ_SNDMORE);
	msgobj = { num: 41, payload: new Buffer("Hello World2") };
	socket.send(constructPBMsg('BufTest',msgobj));*/
}

/*处理checkSession请求*/
function handlecheckSessionReq(res,cp)
{
	var data;
	
	res.writeHead(200, { "Content-Type": "text/plain" });
	if((cp.sId)&&(data = sessionManager.getSession(cp.sId)))
   {
	   res.write(JSON.stringify(data));
   }else
   {
	  res.write(JSON.stringify({}));  //发送一个空对象
	  logToConsole("sessionManager.getSession fail:" + cp.sId); 
   }
   res.end();
}

/*处理listPageDevices请求*/
function handleListPageReq(res,cp)
{
	var data = {};
	res.writeHead(200, { "Content-Type": "text/plain" });
	if(cp.deviceTableType == 'DiscoveryDevices')
	{
	  dataMgr.getDiscoveryDevicesData(cp.requestedPage,res);
	  return;
	}
	if(cp.deviceTableType == 'RegisteredDevices')
	{
	 dataMgr.getRegisteredDevicesData(cp.requestedPage,res);
	 return;
	}
	res.write(JSON.stringify(data));
	res.end();
}

/*处理设备注册请求*/
function handleRegisterDevices(res,cp)
{
	var data;
	res.writeHead(200, { "Content-Type": "text/plain" });
	if((cp)&&(cp.registerUuids))
	{
	   if(cp.registerUuids.length > 0)
	   {
	      dataMgr.registerDDevices(cp.registerUuids,res);
	   }else
	   {
		  res.end();
	   }
	}else
	{
	  res.end();
	}
}

/*处理设备退网请求*/
function handleunRegisterDevices(res,cp)
{
	var data;
	res.writeHead(200, { "Content-Type": "text/plain" });
	if((cp)&&(cp.unregisterGuids))
	{
	   if(cp.unregisterGuids.length > 0)
	   {
	     dataMgr.unregisterRDevices(cp.unregisterGuids,res);
	   }else
	   {
		 res.end();  
	   }
	}else
	{
	  res.end();
	}
}

/*处理删除发现设备的请求*/
function handleDelDiscoveredDevices(res,cp)
{
	var data;
	res.writeHead(200, { "Content-Type": "text/plain" });
	if((cp)&&(cp.delUuids))
	{
	   if(cp.delUuids.length > 0)
	   {
	     dataMgr.delDDevices(cp.delUuids,res);
	   }else
	   {
		 res.end();  
	   }
	}else
	{
	  res.end();
	}
	
};

/*处理web服务接口调用*/
function handleInvokeWsInterface(res,cp)
{
    var data;
	res.writeHead(200, { "Content-Type": "text/plain" });
	if((cp)&&(cp.guid))
	{
	   logToConsole("interfacename:" + cp.infName+' guid:'+cp.guid+' params:'+cp.infPara);	
	   dataMgr.getDeviceSeviceAddr(cp.guid,cp.infName,cp.infPara,res);
	}else
	{
		res.end();
	}
}

/*获取设备的StreamUri*/
function handleGetStreamUri(res,cp)
{
    var data;
	res.writeHead(200, { "Content-Type": "text/plain" });
	if((cp)&&(cp.guid))
	{	
	   dataMgr.getDeviceStreamUri(cp.guid,res);
	}else
	{
		res.end();
	}
}


