// JavaScript Document
//-----------全局变量--------------------------------------------------------------------------------------
var guid; //页面调用的设备GUID
var currInf; //当前调用接口
var inputsoap; //输入参数文本元素
var outputsoap; //接口调用返回文本元素

function createXmlDOM(xmlStr){   
    var xmlDom = null;   
    if (navigator.userAgent.indexOf("MSIE") > 0){//IE only   
        xmlDom=new ActiveXObject("Microsoft.XMLDOM");   
        xmlDom.async="false";   
        xmlDom.loadXML(xmlStr);   
     }else{//FF,Chrome 等   
         xmlDom=(new DOMParser()).parseFromString(xmlStr,"text/xml");   
      }   
    return xmlDom;   
}   

function trace(text) {
	  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function ajaxError(xhr,state)
{
	trace("ajax invoke error:"+state);
}

/*初始化InputSoap中的文本信息*/
function initInputSoap()
{
	var paramstr = '';
	switch(currInf){
		 case 'SetSystemFactoryDefault':
		 paramstr = '<FactoryDefault>Soft</FactoryDefault>';
		 break;
		 
		 case 'GetVideoEncoderConfigurationOptions':
		 paramstr = '<ConfigurationToken>######</ConfigurationToken>';
		 break;
		 
		 case 'GetVideoSourceConfigurationOptions':
		 paramstr = '<ConfigurationToken>######</ConfigurationToken><ProfileToken>######</ProfileToken>';
		 break;
		 
		 case 'GetStreamUri':
		 paramstr = '<StreamSetup>';
		 paramstr +='<Stream xmlns="http://www.onvif.org/ver10/schema">RTP-Unicast</Stream>';
		 paramstr +='<Transport xmlns="http://www.onvif.org/ver10/schema">';
         paramstr +='<Protocol>UDP</Protocol>';
         paramstr +='</Transport>';
         paramstr +='</StreamSetup>';
         paramstr +='<ProfileToken>######</ProfileToken>';
		 break;
		 
		 default:
		 break;
	}
	
	return paramstr;
}

//转换inputsoap中字符串为对象
function convertParam(paramstr)
{
	return paramstr;
}

String.prototype.removeLineEnd = function()
{
	return this.replace(/(<.+?\s+?)(?:\n\s*?(.+?=".*?"))/g,'$1 $2')
}

function formatXml(text)
{
	  //去掉多余的空格
	  text = '\n' + text.replace(/(<\w+)(\s.*?>)/g,function($0, name, props)
	  {
		  return name + ' ' + props.replace(/\s+(\w+=)/g," $1");
	  }).replace(/>\s*?</g,">\n<");
	
	  //把注释编码
	  text = text.replace(/\n/g,'\r').replace(/<!--(.+?)-->/g,function($0, text)
	  {
		  var ret = '<!--' + escape(text) + '-->';
		  //alert(ret);
		  return ret;
	  }).replace(/\r/g,'\n');
	
	  //调整格式
	  var rgx = /\n(<(([^\?]).+?)(?:\s|\s*?>|\s*?(\/)>)(?:.*?(?:(?:(\/)>)|(?:<(\/)\2>)))?)/mg;
	  var nodeStack = [];
	  var output = text.replace(rgx,function($0,all,name,isBegin,isCloseFull1,isCloseFull2 ,isFull1,isFull2){
			  var isClosed = (isCloseFull1 == '/') || (isCloseFull2 == '/' ) || (isFull1 == '/') || (isFull2 == '/');
			  //alert([all,isClosed].join('='));
			  var prefix = '';
			  if(isBegin == '!')
			  {
				  prefix = getPrefix(nodeStack.length);
			  }
			  else 
			  {
				  if(isBegin != '/')
				  {
					  prefix = getPrefix(nodeStack.length);
					  if(!isClosed)
					  {
						  nodeStack.push(name);
					  }
				  }
				  else
				  {
					  nodeStack.pop();
					  prefix = getPrefix(nodeStack.length);
				  }
			
			  }
			  var ret =  '\n' + prefix + all;
			  return ret;
      });

	  var prefixSpace = -1;
	  var outputText = output.substring(1);
	  //alert(outputText);
	  
	  //把注释还原并解码，调格式
	  outputText = outputText.replace(/\n/g,'\r').replace(/(\s*)<!--(.+?)-->/g,function($0, prefix,  text)
	  {
		  //alert(['[',prefix,']=',prefix.length].join(''));
		  if(prefix.charAt(0) == '\r')
			  prefix = prefix.substring(1);
		  text = unescape(text).replace(/\r/g,'\n');
		  var ret = '\n' + prefix + '<!--' + text.replace(/^\s*/mg, prefix ) + '-->';
		  //alert(ret);
		  return ret;
	  });
	
	  return outputText.replace(/\s+$/g,'').replace(/\r/g,'\r\n');
}
	
	
function getPrefix(prefixIndex)
{
	var span = '    ';
	var output = [];
	for(var i = 0 ; i < prefixIndex; ++i)
	{
		output.push(span);
	}

	return output.join('');
}       


//-----------发送到服务器的命令请求和回应----------------------------------------------------------------------
/*发送调用命令到服务器*/
function sendInvokeCmd(paramString)
{
	var paraObj = convertParam(paramString);
	 $.ajax({
	     type:"POST",
		 url:"invokeWsInterface",
		 data:JSON.stringify(
		       {guid:guid,
			    infName:currInf,
				infPara: paraObj
			   }),
		 dataType:"json",
		 success: handleWsResponse,
		 error:ajaxError
	   });  	
}

function handleWsResponse(data,state)
{
	if((data)&&('errno' in data))
	{
		if(data.errno != 0)
		{
			alert('调用失败，错误码：'+data.errno+'\r\n错误原因：'+data.errdesc);
		}else
		{
		   var xmlDoc = createXmlDOM(data.result);
		   //outputsoap.textContent = new XMLSerializer().serializeToString(xmlDoc); 
		  outputsoap.value = formatXml(data.result);

		}
	}else
	{
		alert('服务器返回错误！');
	}
	
}
//--------------------页面事件-----------------------------------------------------------------------------
/*页面初始化函数*/
function init()
{
	//获取页面元素变量
	guid = window.name; 
	document.title = guid;
	if(guid.indexOf('guid:') < 0)
	{
		closeWindow();
		return;
	}
	
	var pagetitles = $(".pagetitle");
	if(pagetitles[0])
	{
	   pagetitles[0].innerHTML += '&nbsp'+guid;
	}
	
	inputsoap = $('#inputSoap')[0];
	outputsoap = $('#outputSoap')[0];
	//确定页面可用状态
	
	//增加元素的事件
	$('#btnInvokeWs')[0].onclick = invokeWsInf;
	
	//初始有效性检验
} 

/*窗口关闭事件*/
function closeWindow()
{
	trace('close window!');
	var userAgent = navigator.userAgent;

	if (userAgent.indexOf("Firefox") != -1 || userAgent.indexOf("Chrome") !=-1) 
	{
	   window.location.href="about:blank";
	   document.title ="about:blank";
	}else{
		window.opener=null;
		window.open('','_self');
		window.close();
	}
}

/*选中服务列表中的接口*/
function onLiClick(e)
{
	var li = e.target;
	currInf = li.textContent;
	$('#titleCurrInf')[0].textContent = currInf;
	
	//根据不同的接口名在inputSoap中设置
	inputsoap.value = formatXml(initInputSoap());
	outputsoap.value = '';
}

/*点击调用服务接口按钮*/
function invokeWsInf()
{
	if(!currInf)
	{
		alert('请先选择一个服务接口');
		return;
	}
	
	//对于系统级操作给出确认提示
	switch(currInf){
	 case 'SetSystemFactoryDefault':
	 case 'SystemReboot':
	 if(!confirm('该接口操作会修改设备的系统参数，确定要执行该操作吗?')){
	  return;
	 }
	 break;
	 
	 default:
	 break;
	}
	
	//清空输出
	outputsoap.value = '';
	
	//发送调用命令到服务器
	sendInvokeCmd(inputsoap.value); 
}



window.addEventListener('load',init,false);
window.addEventListener('unload',closeWindow,false);

