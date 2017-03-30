
//全局变量定义
//var wsuri = 'ws://'+document.location.host+':80';
var wsuri = '/stoc/browser/';
var wsocket;
var errorOccured = false;
var sessionId;  //登录该页面的sessionId
var sessionData; //从服务器返回的sessionData

/*页面元素定义*/
var divTablePager; //表格分页管理器
var btnListDiscoveryDevices; //显示发现设备列表
var btnRegisterDiscoveryDevices; //设备入网
var btnListRegisteredDevices; //显示入网设备列表
var imgExit; //用户退出按钮
var tableDiscovered; //发现设备列表
var tableRegistered; //入网设备列表
/*全局容器和变量*/
var curTableType; //当前显示列表的类型，是发现列表还是入网列表
var curTabelPageIndex; //当前显示列表的当前页数（目前每页固定为10条）
var totalTableNum; //当前显示列表的总条数
var PAGECOUNT = 10;  //每页记录

function trace(text) {
	  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function ajaxError(xhr,state)
{
	trace("ajax invoke error:"+state);
}

//********************页面处理函数和websocket事件处理函数**************************************************************************
//********************页面处理函数和websocket事件处理函数**************************************************************************
/*页面初始化函数*/
function init()
{
	//获取页面元素变量
	btnListDiscoveryDevices = document.getElementById('listDiscoveryDevices');
	btnListRegisteredDevices = document.getElementById('listRegisteredDevices');
	btnRegisterDiscoveryDevices = document.getElementById('registerDiscoveryDevices');
	imgExit = document.getElementById('exit');
	divTablePager = document.getElementById('tablePager');
	tableDiscovered = document.getElementById('discoveredTable');
	tableRegistered = document.getElementById('registeredDevicesTable');
	
	//确定页面可用状态
	
	//增加元素的事件
	imgExit.onclick = redirectLogin;
	btnListDiscoveryDevices.onclick = refreshDDonClick; //刷新发现设备列表
	btnListRegisteredDevices.onclick = refreshRDonClick; //刷新入网设备列表
	btnRegisterDiscoveryDevices.onclick = batchRegDDonClick; //批量入网发现设备
	$('#pagepre').click(pagepreOnClick);
	$('#pagenext').click(pagenextOnClick);
	
	//初始有效性检验
	checkSession();
	
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

/*重定向到登录窗口*/
function redirectLogin()
{
	window.location = 'login.html';
}

/*修改EXIT按钮的提示信息*/
function updatePageStatus(info)
{
	   textnodeId = document.createTextNode(info);
	   imgExit.parentNode.insertBefore(textnodeId,imgExit);
}

/*请求页面失败*/
function validPageFail()
{
	alert("向服务器请求页面失败！");
	closeWindow();
}

/*检查此页面携带的sessionId是否合法*/
function checkSession()
{
   var result = false;
   var query = document.location.search;
    
   if(query)
   {
	   sessionId = query.substring(1); //获取URL中问号之后的字符串
	   trace("get sessionId from url:"+sessionId);
	   $.ajax({
	     type:"POST",
		 url:"checkSession",
		 data:JSON.stringify(
		       {sId:sessionId
			   }),
		 dataType:"json",
		 success: checkSessionResult,
		 error:ajaxError
	   });
	}else
	{
		validPageFail();
	} 
}

/*刷新发现设备列表*/
function refreshDDonClick()
{
	if(divTablePager.hidden)
	{
		divTablePager.hidden = false;
	}
	if(!tableRegistered.hidden)
	{
		tableRegistered.hidden = true;
	}
	if(tableDiscovered.hidden)
	{
		tableDiscovered.hidden= false;
	}
	$("#pagerTitle").text("发现设备列表");
	//删除"调用设备web服务"的图标
	if($("#tablePager h3 #invokeWs").length > 0)
	{
		$("#tablePager h3 #invokeWs").remove();
	}
	//删除"设备退网"的图标
	if($("#tablePager h3 #unregisSelected").length > 0)
	{
		$("#tablePager h3 #unregisSelected").remove();
	}
	//删除"浏览设备实时视频的图标
	if($("#tablePager h3 #playvideo").length > 0)
	{
		$("#tablePager h3 #playvideo").remove();
	}
	//增加"入网选中设备"按钮
	if($("#tablePager h3 #regisSelected").length == 0)
	{
		$("#tablePager h3").append("<img id='regisSelected' class='cmdIcon' src='images/check2.png' title='入网选中设备'></img>");
		$("#tablePager h3 #regisSelected").on('click',onRegisSelectedClick);
	}
	//增加"删除选中设备"按钮
	if($("#tablePager h3 #delSelected").length == 0)
	{
		$("#tablePager h3").append("<img id='delSelected' class='cmdIcon' src='images/delDDevice.jpg' title='删除选中设备'></img>");
		$("#tablePager h3 #delSelected").on('click',onDelSelectedClick);
	}
	curTableType = "DiscoveryDevices";
	requestPageDevices(curTableType,1);
}

/*刷新入网设备列表*/
function refreshRDonClick()
{
	if(divTablePager.hidden)
	{
		divTablePager.hidden = false;
	}
	if(tableRegistered.hidden)
	{
		tableRegistered.hidden = false;
	}
	if(!tableDiscovered.hidden)
	{
		tableDiscovered.hidden= true;
	}
	$("#pagerTitle").text("入网设备列表");
	 //删除"入网选中设备"图标
	if($("#tablePager h3 #regisSelected").length > 0)
	{
		$("#tablePager h3 #regisSelected").remove();
	}
	 //删除"删除选中设备"图标
	if($("#tablePager h3 #delSelected").length > 0)
	{
		$("#tablePager h3 #delSelected").remove();
	}
	//添加"设备退网"图标
	if($("#tablePager h3 #unregisSelected").length == 0)
	{
		$("#tablePager h3").append("<img id='unregisSelected' class='cmdIcon' src='images/unregistry.png' title='设备退网'></img>");
		$("#tablePager h3 #unregisSelected").on('click',onUnregisSelectedClick);
	}
	//添加"调用设备服务接口"图标
	if($("#tablePager h3 #invokeWs").length == 0)
	{
		$("#tablePager h3").append("<img id='invokeWs' class='cmdIcon' src='images/webservice.png' title='调用web服务接口'></img>");
		$("#tablePager h3 #invokeWs").on('click',onInvokeWsClick);
	}
	//添加"浏览设备实时视频"图标
	if($("#tablePager h3 #playvideo").length == 0)
	{
		$("#tablePager h3").append("<img id='playvideo' class='cmdIcon' src='images/videoplayer.png' title='浏览设备实时视频'></img>");
		$("#tablePager h3 #playvideo").on('click',onPlayVideoClick);
	}
	
	curTableType = "RegisteredDevices";
	requestPageDevices(curTableType,1);
}

/*批量入网设备按钮点击事件*/
function batchRegDDonClick()
{
	alert('建设中...');
}

/*入网设备按钮*/
function onRegisSelectedClick()
{
	var checkList = $("#discoveredTable tbody tr :checked");
	var checkids = [];
	var checkedThs = []; //放入网图片的th元素数组
	var selectIndex = 0;
	if(checkList.length >0)
	{
	  for(var index=0;index<checkList.length;index++)
	  {
		  var th = checkList[index].parentElement;
		  var thEP = th.nextSibling;
		  if($(th).children('#regisSelected').length == 0)
		  {
			  checkids[selectIndex] = thEP.textContent;
			  checkedThs[selectIndex] = th;
			  selectIndex++;
		  }
		  checkList[index].checked = false;
	  }
	  if(selectIndex == 0)
	  {
		  alert('所选择的设备都为入网设备');
		  return;
	  }else
	  {
		  registerDDevices(checkids,checkedThs);
	  }
	}else{
	  alert('请先选择要入网的设备');
	  return;
	}
}
/*设备退网按钮*/
function onUnregisSelectedClick()
{
  if(confirm('是否退网设备?'))
  {
	var checkList = $("#registeredDevicesTable tbody tr :checked");
	var checkids = [];
	var checkedTrs = []; //放入网图片的th元素数组
	
	if(checkList.length >0)
	{
	  for(var index=0;index<checkList.length;index++)
	  {
		  var th = checkList[index].parentElement;
		  var thGUID = th.nextSibling;
		 
		  checkids[index] = thGUID.textContent;
		  checkedTrs[index] = th.parentElement;
		  checkList[index].checked = false;
	  }
	 
	  unregisterRDevices(checkids,checkedTrs);
	}else{
	  alert('请先选择要退网的设备');
	  return;
	}
  }
}

/*删除发现设备按钮点击*/
function onDelSelectedClick()
{
  if(confirm('是否删除设备?删除后将不可恢复'))
  {
	var checkList = $("#discoveredTable tbody tr :checked");
	var checkids = [];
	var checkedTrs = []; //放入网图片的th元素数组
	
	if(checkList.length >0)
	{
	  for(var index=0;index<checkList.length;index++)
	  {
		  var th = checkList[index].parentElement;
		  var thuuid = th.nextSibling;
		 
		  checkids[index] = thuuid.textContent;
		  checkedTrs[index] = th.parentElement;
		  checkList[index].checked = false;
	  }
	 
	  delDDevices(checkids,checkedTrs);
	}else{
	  alert('请先选择要删除的设备');
	  return;
	}
  }
}

/*调用web服务接口*/
function onInvokeWsClick()
{
	
	var checkList = $("#registeredDevicesTable tbody tr :checked");
	var selectedGuid;
	if(checkList.length < 1)
	{
		alert("请先选择一个ONVIF设备");
		return;
	}
	if(checkList.length > 1)
	{
		alert("选择的设备多于一个，请只选择一个ONVIF设备");
		return;
	}
	var th = checkList[0].parentElement;
	var thGUID = th.nextSibling;
	var guid = thGUID.textContent;
	var nTop, nLeft;
	
	window.open("webserviceInvoke.html", guid);
	checkList[0].checked = false;
}

/*调用‘播放实时视频’接口*/
function onPlayVideoClick()
{
	var checkList = $("#registeredDevicesTable tbody tr :checked");
	var selectedGuid;
	if(checkList.length < 1)
	{
		alert("请先选择一个ONVIF设备");
		return;
	}
	if(checkList.length > 1)
	{
		alert("选择的设备多于一个，请只选择一个ONVIF设备");
		return;
	}
	var th = checkList[0].parentElement;
	var thGUID = th.nextSibling;
	var guid = thGUID.textContent;
	var nTop, nLeft;
	nTop  = screen.height/2 - 370;
	nLeft = screen.width/2 - 380;
	var sFeatures = "width=760, height=640, location=0, menubar=0, resizable=0, scrollbars=0, status=0, toolbar=0, top=" + nTop + ", left=" + nLeft;
	window.open("mediaPlayer.html", 'media_'+guid,sFeatures);
	checkList[0].checked = false;
}

/*将获取的数据填入到当前发现设备表中*/
function writeDDTableDataArray(dataArray,curPI)
{
	var tr ;
   for(var i =0 ;i<dataArray.length;i++)
   {
	   var trindex = PAGECOUNT*(curPI-1)+i+1; //根据当前页计算序号
	   var data = dataArray[i];
	   if(!data.isReg)
	   { //还未入网
		   tr = "<tr><th  scope='row'><input type='checkbox' style='float:left;' value='"+trindex+"'>"+trindex+"</th>";
	    }else
		{ //已经入网
			tr = "<tr><th  scope='row'><input type='checkbox' style='float:left;' value='"+trindex+"'>"+trindex+
			"<img id='regisSelected' src='images/check0.png' title='已入网' width='15px' height='15px'></img>"+"</th>";
		}
		
		tr+="<td >"+data.er+"</td>";
		tr+="<td >"+data.types+"</td>";
		tr+="<td >"+data.scopes+"</td>";
		tr+="<td >"+data.xaddr+"</td>";
		tr+="<td >"+data.mv+"</td>";
		tr+="</tr >";
		$("#discoveredTable tbody").append(tr); 
   }	
}

/*将获取的数据填入到当前入网设备表中*/
function writeRDTableDataArray(dataArray,curPI)
{
   var tr ;
   for(var i =0 ;i<dataArray.length;i++)
   {
	   var trindex = PAGECOUNT*(curPI-1)+i+1; //根据当前页计算序号
	   var data = dataArray[i];
	   tr = "<tr><th  scope='row'><input type='checkbox' style='float:left;' value='"+trindex+"'>"+trindex+"</th>";
	   tr+="<td >"+data.guid+"</td>";
		tr+="<td >"+data.er+"</td>";
		tr+="<td >"+data.types+"</td>";
		tr+="<td >"+data.xaddr+"</td>";
		tr+="</tr >";
		$("#registeredDevicesTable tbody").append(tr); 
   }	
}

/*计算页面导航（前一页，后一页）箭头是否可用*/
function updateTablePagerNav(PageInd,total)
{
	var totalpagenum = 0;
	if((total%PAGECOUNT)>0)
	{
	   totalpagenum =  parseInt(total/PAGECOUNT)+1;
	}
	if(PageInd >1)
	{
		$('#pagepre').attr('class','');
		$('#pagepre').attr('disabled',false);
	}else
	{
		$('#pagepre').attr('class','imgDisabled');
		$('#pagepre').attr('disabled',true);
	}
	if(PageInd <totalpagenum)
	{
	   $('#pagenext').attr('class','');
	   $('#pagenext').attr('disabled',false);	
	}else
	{
	   $('#pagenext').attr('class','imgDisabled');
	   $('#pagenext').attr('disabled',true);
	}
}

/*'后一页'按钮点击事件*/
function pagenextOnClick()
{
  if(!$('#pagenext').attr('disabled'))
  {
	 requestPageDevices(curTableType,curTabelPageIndex+1);
  } 	
}

/*'前一页'按钮点击事件*/
function pagepreOnClick()
{
  if(!$('#pagepre').attr('disabled'))
  {
	requestPageDevices(curTableType,curTabelPageIndex-1);
  }
}

/* 向服务器获取制定页的数据*/
function requestPageDevices(tableType,pageIndex)
{
	$.ajax({
	     type:"POST",
		 url:"listPageDevices",
		 data:JSON.stringify(  
		       {deviceTableType:tableType,
			    requestedPage:pageIndex
				}),
		 dataType:"json",
		 success: listTableDataResult,
		 error:ajaxError
	   });
}

/*向服务器发送设备注册请求*/
function registerDDevices(regIds,regThs)
{
	if((regIds)&&(regIds.length>0))
	{
		//发送请求到服务器获取记录
		$.ajax({
			 type:"POST",
			 url:"registerDevices",
			 data:JSON.stringify(  //目前放的空结构，便于以后扩展
				   {registerUuids:regIds,
				   }),
			 dataType:"json",
			 success: function(data,state){
				 var returnFailedIds = {};
				 var failedIdsString = '';
				 if((data)&&(data.failedUuids))
				 {
					 for(i in data.failedUuids)
					 {
						returnFailedIds[data.failedUuids[i]] = null; 
					 }
				 }
				 for(j in regIds)
				 {
					 if(!(regIds[j] in returnFailedIds))
					 {//不在返回错误ID列表中，加上图标。
					   $(regThs[j]).append("<img id='regisSelected' src='images/check0.png' title='已入网' width='15px' height='15px'></img>"); 
					 }else
					 {
						failedIdsString += regIds[j]+";"; 
					 }
				 }
				 if(failedIdsString != '')
				 {
					 alert("发现设备："+failedIdsString+'未注册成功');
				 }
			 },
			 error:ajaxError
		   });
	}else
	{
	  trace('registerDDevices: regIds is empty!');;
	}
}

/*向服务器发送设备退网请求*/
function unregisterRDevices(unregGuids,checkedTrs)
{
	if((unregGuids)&&(unregGuids.length>0))
	{
	   var rdtable = $("#registeredDevicesTable tbody")[0];
	   $.ajax({
	     type:"POST",
		 url:"unregisterDevices",
		 data:JSON.stringify(  //目前放的空结构，便于以后扩展
		       {unregisterGuids:unregGuids,
			   }),
		 dataType:"json",
		 success: function(data,state){
			 var returnFailedIds = {};
			 var failedIdsString = '';
			 if((data)&&(data.failedGuids))
			 {
				 for(i in data.failedGuids)
				 {
					returnFailedIds[data.failedGuids[i]] = null; 
				 }
			 }
			 for(j in unregGuids)
			 {
				 if(!(unregGuids[j] in returnFailedIds))
				 {//不在返回错误ID列表中，从表中删除该行。
				    rdtable.removeChild(checkedTrs[j]);
					totalTableNum--;
					$("#tabletotalnum").text(totalTableNum);
				 }else
				 {
					failedIdsString += unregGuids[j]+";"; 
				 }
			 }
			 updateTablePagerNav(curTabelPageIndex,totalTableNum);
			 if(failedIdsString != '')
			 {
				 alert("注册设备："+failedIdsString+'退网失败！');
			 }
		 },
		 error:ajaxError
	   });
	}else
	{
	  trace('unregisterRDevices: unregGuids is empty!');;
	}
};

/*向服务器发送删除设备请求*/
function delDDevices(delUuids,checkedTrs){
	if((delUuids)&&(delUuids.length>0)){
	   var ddtable = $("#discoveredTable tbody")[0];
	   $.ajax({
	     type:"POST",
		 url:"delDiscoveredDevices",
		 data:JSON.stringify(  //目前放的空结构，便于以后扩展
		       {delUuids:delUuids,
			   }),
		 dataType:"json",
		 success: function(data,state){
			 var returnFailedIds = {};
			 var failedIdsString = '';
			 if((data)&&(data.failedUuids))
			 {
				 for(i in data.failedUuids)
				 {
					returnFailedIds[data.failedUuids[i]] = null; 
				 }
			 }
			 for(j in delUuids)
			 {
				 if(!(delUuids[j] in returnFailedIds))
				 {//不在返回错误ID列表中，从表中删除该行。
				    ddtable.removeChild(checkedTrs[j]);
					totalTableNum--;
					$("#tabletotalnum").text(totalTableNum);
				 }else
				 {
					failedIdsString += delUuids[j]+";"; 
				 }
			 }
			 updateTablePagerNav(curTabelPageIndex,totalTableNum);
			 if(failedIdsString != '')
			 {
				 alert("发现设备："+failedIdsString+'删除失败！');
			 }
		 },
		 error:ajaxError
	   });
	}else
	{
	  trace('delDDevices: delUuids is empty!');
	}
};

//************************************************命令响应函数************************************
//************************************************命令响应函数************************************
/*checkSession操作的response处理*/
function checkSessionResult(data,state)
{
   if((data)&&(data.username))
   {
	  updatePageStatus("登录用户:"+data.username+" "); 
   }else
   {
	   validPageFail();
   }
}

/* listPageDevices请求的回应*/
function listTableDataResult(data,state)
{
	var totalNum = 0;
	var curPageInd = 0;
	
	if((data)&&(data.dataType))
	{
	    if(data.dataType == 'DiscoveryDevices') //为发现设备
		{
		   $("#discoveredTable tbody tr").remove(); //删除表格中所有行
		}
		if(data.dataType == 'RegisteredDevices') //为入网设备
		{
		   $("#registeredDevicesTable tbody tr").remove(); //删除表格中所有行
		}
	   totalNum = data.totalNum;
	   curPageInd = data.currPageIndex;
	   if(data.devicesData.length>0)
	   {
		  if(data.dataType == 'DiscoveryDevices') //为发现设备
		  {
		  writeDDTableDataArray(data.devicesData,curPageInd);
		  }
		  if(data.dataType == 'RegisteredDevices') //为发现设备
		  {
		  writeRDTableDataArray(data.devicesData,curPageInd);
		  }
	   }	
	}
	$("#tabletotalnum").text(totalNum);
	$("#currentpage").text(curPageInd);
	curTabelPageIndex = curPageInd;
    totalTableNum = totalNum; 
	updateTablePagerNav(curPageInd,totalNum);
}


window.addEventListener('load',init,false);
window.addEventListener('unload',closeWindow,false);
//window.onunload = closeWindow;
