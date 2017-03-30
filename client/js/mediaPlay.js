// JavaScript Document
var selecturl;
var mrl;
var guidstr;
var vlcembed;
var btnplay;

function trace(text) {
	  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function ajaxError(xhr,state)
{
	trace("ajax invoke error:"+state);
}

//--------------------页面事件-----------------------------------------------------------------------------
/*页面初始化函数*/
function init()
{
	//获取页面元素变量
	mediaguid = window.name; 
	guidstr = mediaguid.substr(6);
	document.title = '播放设备:'+guidstr;
	if(mediaguid.indexOf('media_') < 0)
	{
		closeWindow();
		return;
	}
	
	selecturl = document.getElementById('selectUrl');
	mrl = document.getElementById('textUrl');
	//mrl.value = selecturl.options[selecturl.selectedIndex].value;
	initSelectUrl();
	vlcembed = document.getElementById('vlcembed');
	btnplay=$('#btnPlay')[0];
	btnplay.onclick = onBtnPlayClick;
	
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

/*播放按钮点击事件*/
function onBtnPlayClick()
{
	vlcembed.playlist.stop();
	vlcembed.playlist.clear();
	var itemid = vlcembed.playlist.add(mrl.value);
	vlcembed.playlist.playItem(itemid);
}

/*从服务器获取设备的streamuri并填入到SelectUrl中*/
function initSelectUrl()
{
	//向服务端获取设备的streamuri数据
	$.ajax({
	     type:"POST",
		 url:"getStreamUri",
		 data:JSON.stringify(
		       {guid:guidstr
			   }),
		 dataType:"json",
		 success: handleStreamUris,
		 error:ajaxError
	   });
}

function handleStreamUris(data,state)
{
	if((data)&&(data.result))
	{
		for(i in data.result){
			var y=document.createElement('option');
            y.text=data.result[i];
		    selecturl.add(y,null);
		}
		//selecturl.selectedIndex = -1;
		mrl.value = selecturl.options[selecturl.selectedIndex].value;
	}
}

window.addEventListener('load',init,false);
window.addEventListener('unload',closeWindow,false);
 