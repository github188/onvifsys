// JavaScript Document

var sessionMgr = function(){
	this.sessionContainer = new Object();
	
	}

sessionMgr.prototype.addSession = function(sessionId,sessionData)
{
	if(sessionId in this.sessionContainer)
	{
		return false;
	}else
	{
		this.sessionContainer[sessionId] = sessionData;
		return true;
	}
}

sessionMgr.prototype.delSession = function(sessionId)
{
	if(sessionId in this.sessionContainer)
	{
		return delete this.sessionContainer[sessionId];
	}else
	{
	   return true;	
	}
}

sessionMgr.prototype.setSession = function(sessionId,sessionData)
{
	if(sessionId in this.sessionContainer)
	{
		this.sessionContainer[sessionId] = sessionData;
		return true;
	}else
	{
		return false;
	}
}

sessionMgr.prototype.getSession = function(sessionId,sessionData)
{
	if(sessionId in this.sessionContainer)
	{
		return this.sessionContainer[sessionId];
	}else
	{
		return null;
	}
}

module.exports = sessionMgr;


