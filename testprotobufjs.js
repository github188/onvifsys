// JavaScript Document
var fs = require("fs"),
    ProtoBuf = require("protobufjs"),
    userProtoStr,
    UserModel ,
    userModel;
 
function testpb(){
	try{
	  //userProtoStr = fs.readFileSync('./imports.proto').toString();
	  //var model = ProtoBuf.loadProtoFile('./imports.proto').build('My');
      UserModel = ProtoBuf.loadProtoFile('./mediaService3.proto').build('com.kedacom.mediaservice');
	  
	  var ME = UserModel.MediaException;
	  var MSEC = UserModel.MediaServiceErrorCode;
	  userModel= new ME();
	  userModel.set('errCode', MSEC.CODE_RECORD_QUERY_EMPTY);
	  userModel.set('errDesc', "Hello World1");
	 
	  var buffer = userModel.encode().toBuffer();
	  var test = ME.decode(buffer);
	  console.log("decode message is:"+test.get('errCode'));
	  console.log("decode message is:"+test.get('errDesc'));
	}catch(e)
	{
		console.log(e.toString());
	}
}

setTimeout(testpb,20000);
