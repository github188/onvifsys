// 用户登录鉴权模块


//用户鉴权构造函数
var authen = function()
{
	this.username = '';
	this.password = '';
	
	
}

authen.prototype.loginAuthen= function()
	{
		if((this.username == 'admin') && (this.password == 'admin'))
		{
			return true;
		}else
		{
			return false;
		}
	}

module.exports = authen;