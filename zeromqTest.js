// JavaScript Document
var fs = require("fs");
var protobuf = require('protobuf.js');
var proto2json = require('proto2json');
var zmq = require("zmq");  
var zmqport = 9998;

var socket = zmq.socket("rep"); //rep,pull
var parser = proto2json.parse(fs.readFileSync('mediatest.proto', 'utf8'));
var translator = new protobuf(parser);


// Just a helper function for logging to the console with a timestamp.
function logToConsole (message) {  
    console.log("[" + new Date().toLocaleTimeString() + "] " + message);
}

socket.bind("tcp://*:"+zmqport, function (error) {  
		if (error) {
			logToConsole("ZMQ failed to bind socket: " + error.message);
			process.exit(0);
		}else
		{  logToConsole("ZMQ success to bind zmq socket: " + zmqport); 
		}
	});

// Add a callback for the event that is invoked when we receive a message.
socket.on("message", function (message,message1) {  
    // Convert the message into a string and log to the console.
    logToConsole("Received message: " + message.toString("utf8")+ (message1?message1.toString("utf8"):""));
	var decoded = translator.decode('BufTest', message);
	socket.send("received: "+decoded.payload.toString());
	//socket.send("received: "+decoded.num.toString());
});

// Connect to the server instance.
//socket.connect('tcp://127.0.0.1:9998');  