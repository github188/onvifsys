// JavaScript Document
var testUrl = '/onvif/device_service';/*'/index_cn.htm';*/
var testHost = '172.16.65.111';
var testport = 5550;
var http = require('http');
var url = require('url');
var xmlparser =require('xml2js');
 

/*返回客户端服务器回应*/
function responseData(data,httpres)
{
	httpres.write(JSON.stringify(data));
	httpres.end();
}

/*返回没有参数的接口消息体body*/
function getNoParamInfBody(inftype,infname){
   return '<'+infname+' xmlns="http://www.onvif.org/ver10/'+inftype+'/wsdl" />';
}

/*返回有参数的接口消息体body*/
function getParamInfBody(inftype,infname,infparam){
   var str = '<'+infname+' xmlns="http://www.onvif.org/ver10/'+inftype+'/wsdl" >';
   str += infparam;
   str += '</'+infname+'>';
   return str;
}

var onvifWsMgr = function(){}

/*返回ws调用错误*/
onvifWsMgr.prototype.returnInvokeWsError = function(guid,errno,errdesc,httpresponse)
{
	var returndata = {};
	returndata.errno = errno;
	returndata.errdesc = errdesc;
	returndata.result = ''; 
	responseData(returndata,httpresponse);
}

/*web 服务调用*/
onvifWsMgr.prototype.invokeInterface = function(addr,guid,infname,paramsObj,httpresponse){
	
	//testWsInvokeByHttp(httpresponse);
	console.log("get service addr:"+addr);
	var urlobj = url.parse(addr);
	if(!urlobj)
	{
		onvifWsMgr.prototype.returnInvokeWsError(guid,2,'device service address is unavailable!',httpresponse);
		return;
	}
	
	var returndata = {};
	returndata.errno = 0;
	returndata.errdesc = '';
	
	if(!buildSoapBody(infname,paramsObj))
	{
		onvifWsMgr.prototype.returnInvokeWsError(guid,3,'requested WS interface is unavailable!',httpresponse);
	}
	
	var reqContent = '<?xml version="1.0" encoding="utf-8"?>';
	reqContent += '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">';
	reqContent += '<s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
	//reqContent += '<GetWsdlUrl xmlns="http://www.onvif.org/ver10/device/wsdl" />';
	reqContent += buildSoapBody(infname,paramsObj);
	reqContent += '</s:Body>';
	reqContent += '</s:Envelope>';

	
	var option = {
	  host:urlobj.hostname,
	  port:urlobj.port,
	  path:urlobj.path,
	  method:'POST',
	  headers:{
		  'Content-Type':'application/soap+xml; charset=utf-8',
		  //'Content-Length': reqContent.length
	  }	
	};
	
	var req = http.request(option,function(res,err){
	   var body='';
	   res.on('data',function (data) { body += data; });
	   res.on('end',function(){
		  // console.log('returned response: '+body);
		  var returndata = {};
		  returndata.errno = 0;
		  returndata.errdesc = '';
		  returndata.result = body; 
		  responseData(returndata,httpresponse);
		  //某些特殊命令，还需要将返回数据放入redis中
		  switch(infname)
		  {
			  case 'GetServices':
			  setDeviceOnvifServiceAddr(guid,body);
			  break;
			  
			  case 'GetStreamUri':
			  setDeviceStreamUri(guid,body);
			  break;
		      
			  default:
			  break;
		  }
	   })
	});
	
	req.on('error',function(err){
	   onvifWsMgr.prototype.returnInvokeWsError(guid,4,'http request fail!',httpresponse);
	});
	req.write(reqContent);
	req.end(); 	
}

/*获取并设置GUID设备的服务地址*/
function setDeviceOnvifServiceAddr(guid,getServicesBody){
	xmlparser.parseString(getServicesBody,  {explicitArray : false}, function(err, jsonobj){
		if(err)
		{console.log('parse service data error:'+err);
		 return;
		}
		var envbody;
		for(i in jsonobj)
		{ 
		   if(i.match('Envelope'))
		   {
			   var envelope = jsonobj[i];
			   for(j in envelope)
			   {
				   if(j.match('Body'))
				   {
					  envbody = envelope[j];
					  break;   
				   }
			   }
			   break;
		   }
		}
		if(!envbody)
		{
			console.log(guid+' set media service fail!');
			return;
		}
		var services = envbody['tds:GetServicesResponse']['tds:Service'] ;
		for(i in services)
		{
			var service = services[i];
			if(service['tds:Namespace'] == 'http://www.onvif.org/ver10/media/wsdl')
			{
				console.log(guid+' has media service:'+service['tds:XAddr']);
				var redisContextobj = require('./redisAccess');
				redisContextobj.setRDServiceSet(guid,'media',service['tds:XAddr']);
				break;
			}
		}
    });
}

/*获取并设置GUID设备的StreamUri*/
function setDeviceStreamUri(guid,getStreamUriBody){
	xmlparser.parseString(getStreamUriBody,  {explicitArray : false}, function(err, jsonobj){
		if(err)
		{console.log('parse StreamUri data error:'+err);
		 return;
		}
		var envbody;
		for(i in jsonobj)
		{ 
		   if(i.match('Envelope'))
		   {
			   var envelope = jsonobj[i];
			   for(j in envelope)
			   {
				   if(j.match('Body'))
				   {
					  envbody = envelope[j];
					  break;   
				   }
			   }
			   break;
		   }
		}
		if(!envbody)
		{
			return;
		}
		var mediaUri;
		for(i in envbody)
		{
			if(i.match('GetStreamUriResponse'))
			{
				var getStreamUriResponse = envbody[i];
				for(j in getStreamUriResponse)
				{
					if(j.match('MediaUri'))
					{
					  mediaUri = getStreamUriResponse[j];
					}
					break;
				}
				break;
			}
		}
		if(!mediaUri)
		{
			console.log(guid+' set StreamUri fail!');
			return;
		}
		for(i in mediaUri)
		{
		   if(i.match('Uri'))
		   {
			   console.log(guid+' has StreamUri:'+mediaUri[i]);//rtsp://172.16.65.151:554/realtime?id=0;aid=0;agent=onvif
			   var redisContextobj = require('./redisAccess');
			   var uri = mediaUri[i].split(';')[0];
			   redisContextobj.setRDStreamUri(guid,uri); 
			   break;
		   }
		}
    });
}


var onvif = new onvifWsMgr();
module.exports = onvif;

/*构建发送请求的soap消息body*/
var buildSoapBody = function(infname,paramsObj){
  switch(infname)
  {
	 case 'GetWsdlUrl': 
	 return buildGetWsdlUrlBody(infname,paramsObj);
	 break;
	 
	 case 'GetCapabilities': 
	 return buildGetCapabilitiesBody(infname,paramsObj);
	 break;
	 
	 case 'GetServices': 
	 return buildGetServicesBody(infname,paramsObj);
	 break;
	 
	 case 'GetHostname': 
	 return buildGetHostnameBody(infname,paramsObj);
	 break;
	 
	 case 'GetDNS': 
	 return buildGetDNSBody(infname,paramsObj);
	 break;
	 
	 case 'GetNetworkInterfaces': 
	 return buildGetNetworkInterfacesBody(infname,paramsObj);
	 break;
	 
	 case 'GetNetworkProtocols': 
	 return buildGetNetworkProtocolsBody(infname,paramsObj);
	 break;
	 
	 case 'GetNetworkDefaultGateway': 
	 return buildGetNetworkDefaultGatewayBody(infname,paramsObj);
	 break;
	 
	 case 'GetDeviceInformation': 
	 return buildGetDeviceInformationBody(infname,paramsObj);
	 break;
	 
	 case 'GetSystemDateAndTime': 
	 return buildGetSystemDateAndTimeBody(infname,paramsObj);
	 break;
	 
	 case 'SetSystemFactoryDefault': 
	 return buildSetSystemFactoryDefaultBody(infname,paramsObj);
	 break;
	 
	 case 'SystemReboot': 
	 return buildSystemRebootBody(infname,paramsObj);
	 break;
	 
	 case 'GetUsers': 
	 return buildGetUsersBody(infname,paramsObj);
	 break;
	 
	 case 'GetProfiles': 
	 return buildGetProfilesBody(infname,paramsObj);
	 break;
	 
	 case 'GetVideoEncoderConfigurations': 
	 return buildGetVideoEncoderConfigurationsBody(infname,paramsObj);
	 break;
	 
	 case 'GetVideoEncoderConfigurationOptions': 
	 return buildGetVideoEncoderConfigurationOptionsBody(infname,paramsObj);
	 break;
	 
	 case 'GetVideoSources': 
	 return buildGetVideoSourcesBody(infname,paramsObj);
	 break;
	 
	 case 'GetVideoSourceConfigurations': 
	 return buildGetVideoSourceConfigurationsBody(infname,paramsObj);
	 break;
	 
	 case 'GetVideoSourceConfigurationOptions': 
	 return buildGetVideoSourceConfigurationOptionsBody(infname,paramsObj);
	 break;
	 
	 case 'GetStreamUri': 
	 return buildGetStreamUriBody(infname,paramsObj);
	 break;
	 
	 default:
	 return null;
  }
}
//GetWsdlUrl 
var buildGetWsdlUrlBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetCapabilities
var buildGetCapabilitiesBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetServices
var buildGetServicesBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetHostname
var buildGetHostnameBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetDNS
var buildGetDNSBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetNetworkInterfaces
var buildGetNetworkInterfacesBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetNetworkProtocols
var buildGetNetworkProtocolsBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetNetworkDefaultGateway
var buildGetNetworkDefaultGatewayBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetDeviceInformation
var buildGetDeviceInformationBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetDeviceInformation
var buildGetSystemDateAndTimeBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//SetSystemFactoryDefault
var buildSetSystemFactoryDefaultBody = function(infname,paramsObj)
{
  return getParamInfBody('device',infname,paramsObj);
}

//SystemReboot
var buildSystemRebootBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetUsers
var buildGetUsersBody = function(infname,paramsObj)
{
  return getNoParamInfBody('device',infname);
}

//GetProfiles
var buildGetProfilesBody = function(infname,paramsObj)
{
  return getNoParamInfBody('media',infname);
}

//GetVideoEncoderConfigurations
var buildGetVideoEncoderConfigurationsBody = function(infname,paramsObj)
{
  return getNoParamInfBody('media',infname);
}

//GetVideoEncoderConfigurationOptions
var buildGetVideoEncoderConfigurationOptionsBody = function(infname,paramsObj)
{
  return getParamInfBody('media',infname,paramsObj);
}

//GetVideoSources
var buildGetVideoSourcesBody = function(infname,paramsObj)
{
  return getNoParamInfBody('media',infname);
}

//GetVideoSourceConfigurations
var buildGetVideoSourceConfigurationsBody = function(infname,paramsObj)
{
  return getNoParamInfBody('media',infname);
}

//GetVideoSourceConfigurationOptions
var buildGetVideoSourceConfigurationOptionsBody = function(infname,paramsObj)
{
  return getParamInfBody('media',infname,paramsObj);
}

//GetStreamUri
var buildGetStreamUriBody = function(infname,paramsObj)
{
  return getParamInfBody('media',infname,paramsObj);
}