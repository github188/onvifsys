var PAGE_COUNT = 10; //分页的记录数

var dataMgr = function(){
	this.PAGECOUNT = PAGE_COUNT;
	this.redisContext = require('./redisAccess'); 
	this.onvif = require('./onvifWsManager');
}

//获取发现设备列表数据
dataMgr.prototype.getDiscoveryDevicesData = function( pageIndex,httpresponse){
  this.redisContext.getDDevicesUuids(pageIndex,httpresponse);
}

//获取入网设备列表数据
dataMgr.prototype.getRegisteredDevicesData = function(pageIndex,httpresponse)
{
  this.redisContext.getRDevicesGuids(pageIndex,httpresponse);
}

/*注册选中的设备，参数为选中设备的UUID集合*/
dataMgr.prototype.registerDDevices = function(uuids,res){
  this.redisContext.registerDDSet(uuids,res);	
}

/*退网选中的设备，参数为选中设备的GUID集合*/
dataMgr.prototype.unregisterRDevices = function(guids,res){
  this.redisContext.unregisterRDSet(guids,res);	
}

/*删除发现设备*/
dataMgr.prototype.delDDevices = function(uuids,res){
  this.redisContext.delDDevicesSet(uuids,res);
}

/*调用web服务接口，先得获取服务的地址*/
dataMgr.prototype.getDeviceSeviceAddr = function(guid,infname,infparam,res){
  //var test_device_svraddr = 'http://172.16.65.111:5550/onvif/device_service/';
  //var test_media_svraddr = 'http://172.16.65.111:5550/onvif/media_service/';
  
  switch(infname)
  {
	  case 'GetProfiles':
	  case 'GetVideoEncoderConfigurations':
	  case 'GetVideoEncoderConfigurationOptions':
	  case 'GetVideoSources':
	  case 'GetVideoSourceConfigurations':
	  case 'GetVideoSourceConfigurationOptions':
	  case 'GetStreamUri':
	  this.redisContext.getMediaSeviceAddr(guid,infname,infparam,res);
	  //this.onvif.invokeInterface(test_media_svraddr+guid,guid,infname,infparam,res);	
	  break;
	  
	  default:
	  this.redisContext.getDeviceSeviceAddr(guid,infname,infparam,res);
	  //this.onvif.invokeInterface(test_device_svraddr+guid,guid,infname,infparam,res);		
   }
}

/*获取设备的StreamUri*/
dataMgr.prototype.getDeviceStreamUri = function(guids,res){
  this.redisContext.getDeviceStreamUri(guids,res);
}

module.exports = dataMgr;