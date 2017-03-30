var redisPort = 6379;  //redis 服务器端口
var redisHost = '127.0.0.1'; //redis服务器主机地址  127.0.0.1
var PAGECOUNT = 10; //分页的记录数
var onvifMgr = require("./onvifWsManager");


/*构造函数*/
var redisUtility = function(){
	this.PAGECOUNT = 10;
	this.redis = require('redis');
	this.client = this.redis.createClient(redisPort,redisHost);
	this.client.on("error", function (err) {
					console.log("Error redis client:" + err);
                  });
}

var redisContext = new redisUtility();

/**************** utility 函数 *************************************************************************/
/*在http response中返回空数据*/
function responseEmptyData(httpresponse)
{
	httpresponse.write(JSON.stringify({}));
	httpresponse.end();
}
/*计算所请求页面的ID数据*/
function calcPagedIDS(idArray,pageindex)
{
	idArray.sort();
	var totalnum = idArray.length;
	var startIndex = (pageindex-1)*PAGECOUNT;
	var endIndex = pageindex*PAGECOUNT; 
	if(startIndex >= totalnum)
	{
		return [];
	}
	if(endIndex >= totalnum)
	{
		return idArray.slice(startIndex);
	}else
	{
		return idArray.slice(startIndex,endIndex);
	}
	
}

/*根据redis中获取的对象数组构建返回对象数据*/
function constructReqedDDdata(totalnum,curpage,ddobjs)
{
	  var ddData = {};
	  
	  ddData.dataType = "DiscoveryDevices";
	  ddData.totalNum = totalnum;
	  ddData.currPageIndex =  curpage;
	  
	  ddData.devicesData = [];
	  j = 0;
	  for(i in ddobjs)
	  {
		var devicedata = {};
		if(ddobjs[i])
		{
			if('GUID' in ddobjs[i])
			{
			  devicedata.isReg = true;
			}else
			{
			  devicedata.isReg = false;
			}
			devicedata.er = ddobjs[i].EndpointReference;
			devicedata.types = ddobjs[i].Types;
			devicedata.scopes = ddobjs[i].Scopes;
			devicedata.xaddr = ddobjs[i].XAddrs;
			devicedata.mv = ddobjs[i].MetadataVersion;
			ddData.devicesData[j] = devicedata;
			j++;
		}
	  }
	  return ddData;
}

/*根据redis中获取的对象数组构建返回对象数据*/
function constructReqedRDdata(totalnum,curpage,ddobjs)
{
	  var ddData = {};
	  
	  ddData.dataType = "RegisteredDevices";
	  ddData.totalNum = totalnum;
	  ddData.currPageIndex =  curpage;
	  
	  ddData.devicesData = [];
	  j = 0;
	  for(i in ddobjs)
	  {
		var devicedata = {};
		if(ddobjs[i])
		{
			devicedata.guid = ddobjs[i].GUID;
			devicedata.er = ddobjs[i].EndpointReference;
			devicedata.types = ddobjs[i].Types;
			devicedata.xaddr = ddobjs[i].XAddrs;
			ddData.devicesData[j] = devicedata;
			j++;
		}
	  }
	  return ddData;
}

/*构建发现设备的GUID*/
function ConstructGUID(uuid)
{
  return uuid.replace('uuid:','guid:');	
}

/*************** 操作函数 ***************************************************************************/

/*关闭redis的客户端*/
redisUtility.prototype.closeClient = function(){
	this.client.end();
}

/*获取Device_discovery_set中的所有元素*/
redisUtility.prototype.getDDevicesUuids = function(pageIndex,httpresponse){
	 var multi = this.client.multi();
	 if(this.client.connected)
	 {
	   this.client.smembers('Device_discovery_set',function(err,reply){
		    //console.log("smembers:"+reply);
			if(reply.length>0)
			{
				var returnedUuid = calcPagedIDS(reply,pageIndex); //将reply排序，根据请求页面的索引计算请求页面应返还的ID数组。
				var totalDDnum = reply.length;
				if(returnedUuid.length >0)
				{
					for(i in returnedUuid)
					{
					  multi.hgetall("Device:"+returnedUuid[i]); //Device:uuid:98190dc2-0890-4ef8-ac9a-5940995e6110
					}
					multi.exec(function(err,reply){
						var reqData = constructReqedDDdata(totalDDnum,pageIndex,reply);
						httpresponse.write(JSON.stringify(reqData));
	                    httpresponse.end();
					});
				}else
				{
					responseEmptyData(httpresponse);
				}
			}else
			{
			  responseEmptyData(httpresponse); 
			}
	   });//end smembers
	 }else
	{
		responseEmptyData(httpresponse);
	}
}

/*获取Device _used_set中的所有元素*/
redisUtility.prototype.getRDevicesGuids = function(pageIndex,httpresponse){
	var multi = this.client.multi();
	if(this.client.connected)
	{
		 this.client.hgetall('Device_registry_set',function(err,reply){
			 if(reply){
				 var guids = [];
				 var j = 0;
				 for(guid in reply)
				 {
					guids[j++] = guid; 
				 }
				 //获取所有的GUID构成数组
				 if(j >0)
				 {
					 var returnedGuid = calcPagedIDS(guids,pageIndex); //将reply排序，根据请求页面的索引计算请求页面应返还的ID数组。
					 var totalRDnum = guids.length;
					 if(returnedGuid.length >0)
					 {
						 for(i in returnedGuid)
						 {
							 multi.hgetall("Device:"+reply[returnedGuid[i]]); 
							 //Device:uuid:98190dc2-0890-4ef8-ac9a-5940995e6118
						 }
						 multi.exec(function(err,reply){
							var reqData = constructReqedRDdata(totalRDnum,pageIndex,reply);
							httpresponse.write(JSON.stringify(reqData));
							httpresponse.end();
					     });
					 }else{
						responseEmptyData(httpresponse); 
					 };
				 }else
				 {
					responseEmptyData(httpresponse); 
				 }		
			 }else
			 {
			   responseEmptyData(httpresponse); 
			 }
		}); 
	}else{
	   responseEmptyData(httpresponse);
	}
}

/*对选中的设备UUID数组进行注册*/
redisUtility.prototype.registerDDSet = function(DDuuids,httpresponse){
	var redisclient = this.client;
    var multi = this.client.multi();
	for(i in DDuuids)
	{ 
	  var ddkey = "Device:"+DDuuids[i];
	  //multi.hexists(ddkey,'GUID');
	  multi.hgetall(ddkey);
	}
	multi.exec(function(err,reply){
		var returnData = {failedUuids:[]};
		for(i in reply)
		{
			var ddobj = reply[i];
			if (!('GUID' in ddobj))
			{//没有GUID属性
			  var guid = ConstructGUID(DDuuids[i]);
			  redisclient.hset("Device:"+DDuuids[i],'GUID',guid);
			  redisclient.hset('Device_registry_set',guid,DDuuids[i]);
			  redisclient.hset('Device:'+guid,'device_service_address',ddobj.XAddrs);
			}
		}
		httpresponse.write(JSON.stringify(returnData));
		httpresponse.end();	
	});
}

/*对选中设备的GUID数组进行退网*/
redisUtility.prototype.unregisterRDSet = function(RDguids,httpresponse){
	var redisclient = this.client;
    var multi = this.client.multi();
	for(i in RDguids)
	{ 
	  //var ddkey = "Device_"+DDuuids[i].replace(':','_');
	  multi.hget('Device_registry_set',RDguids[i]);
	}
	multi.exec(function(err,reply){
		var returnData = {failedGuids:[]};
		for(i in reply)
		{
			var uuid = reply[i];
			if(uuid)
			{//没有GUID属性
			  var ddkey = "Device:"+uuid;
			  var guid = RDguids[i];
			  redisclient.hdel(ddkey,'GUID');
			  redisclient.hdel('Device_registry_set',guid);
			  redisclient.del('Device:'+guid);
			  redisclient.del('StreamUri:'+guid);
			}
		}
		httpresponse.write(JSON.stringify(returnData));
		httpresponse.end();	
	});
}

/*对选中的发现设备进行删除*/
redisUtility.prototype.delDDevicesSet = function(DDuuids,httpresponse){
	var redisclient = this.client;
    var multi = this.client.multi();
	for(i in DDuuids)
	{ 
	  multi.hgetall("Device:"+DDuuids[i]);
	}
	multi.exec(function(err,reply){
		var returnData = {failedUuids:[]};
		for(i in reply)
		{
			var ddobj = reply[i];
			if(ddobj)
			{
				if('GUID' in ddobj)
				{//删除注册设备相关的记录
				  var guid = ddobj.GUID;
				  redisclient.hdel('Device_registry_set',guid);
				  redisclient.del('Device:'+guid);
				  redisclient.del('StreamUri:'+guid);
				}
				redisclient.srem('Device_discovery_set',DDuuids[i]);
				redisclient.del("Device:"+DDuuids[i]);
			}
		}
		httpresponse.write(JSON.stringify(returnData));
		httpresponse.end();	
	});
}

/*获取入网设备的设备服务的地址，以便调用web服务*/
redisUtility.prototype.getDeviceSeviceAddr = function(guid,infname,infparam,res){
	var redisclient = this.client;
    var multi = this.client.multi();
	
	redisclient.hget('Device:'+guid,'device_service_address',function(err,reply){
	   if(!reply)
	   {
		   onvifMgr.returnInvokeWsError(guid,1,'get device service address from redis fail!',res);
		   return;
	   }
	   var addr = reply; 
	   onvifMgr.invokeInterface(addr,guid,infname,infparam,res);
	});

}

/*获取入网设备的媒体服务的地址，以便调用web服务*/
redisUtility.prototype.getMediaSeviceAddr = function(guid,infname,infparam,res){
   var redisclient = this.client;
   var multi = this.client.multi();
	
	redisclient.hget('Device:'+guid,'media_service_address',function(err,reply){
	   if(!reply)
	   {
		   onvifMgr.returnInvokeWsError(guid,5,'Has not get media service address,please invoke GetServices first!',res);
		   return;
	   }
	   var addr = reply; 
	   onvifMgr.invokeInterface(addr,guid,infname,infparam,res);
	});
	
}

/*设置GUID设备的服务地址*/
redisUtility.prototype.setRDServiceSet = function(guid,servicetype,serviceaddr){
	var redisclient = this.client;
	redisclient.hget('Device:'+guid,servicetype+'_service_address',function(err,reply){
		if(!reply){
		  redisclient.hset('Device:'+guid,servicetype+'_service_address',serviceaddr);
		}
	});
}

/*设置GUID设备的streamuri*/
redisUtility.prototype.setRDStreamUri = function(guid,streamuri){
	var redisclient = this.client;
    redisclient.sadd('StreamUri:'+guid,streamuri);
}

/*获取GUID设备streamuri*/
redisUtility.prototype.getDeviceStreamUri = function(guid,httpresponse){
	var redisclient = this.client;
	redisclient.smembers('StreamUri:'+guid,function(err,reply){
		if(reply){
		  var returnData = {};
		  returnData.result = reply;
		  httpresponse.write(JSON.stringify(returnData));
		  httpresponse.end();	
		}else
		{ responseEmptyData(httpresponse);}
	});
}

module.exports = redisContext;

