const 
	app = require('express')()
	, redis = require("redis")
	, http = require('http').Server(app)
	, WebSocketServer = require('ws').Server
	, io = new WebSocketServer({ port: 3000 })
	, MongoClient = require('mongodb').MongoClient
	, DB_CONN_STR = 'mongodb://localhost:27017/test'
	, fs = require('fs')
	;    

let userList = {};
console.log('websocket server started...');

//redis
const redisClient = redis.createClient();
redisClient.on("error", function(err) {
    console.log("redis error " + err);
});

redisClient.on("connect", () => {
	console.log("redis server started...");
});

const insertData = (db, data, cb) => {
	const collection = db.collection('message');
	collection.insert({
		date : data.date,
		millis : Date.now(),
		name : data.name,
		message : data.message
	}, cb);
	db.close();
};

const getData = (db, cb) => {
	const collection = db.collection('message');
	collection.find({}, {'name' : 1, 'date' : 1, 'message' : 1, 'millis' : 1})
		.sort({'millis' : -1})
		.limit(100)
		.toArray((err, result) => {

			if (err) {
				return console.log('mongodb error:' + err);
			}
			cb(result.sort((a, b) => {
				return a.millis - b.millis;
			}));
		});
	db.close();
};

const getDate = () => {
	const biggerTen = (value) => {
		return value >= 10 ? value : '0' + value;
	};
	
	var date = new Date;
	date = date.getFullYear() + '-'
		+ biggerTen(date.getMonth() + 1) + '-' 
		+ biggerTen(date.getDate()) + ' ' 
		+ biggerTen(date.getHours()) + ':' 
		+ biggerTen(date.getMinutes()) + ':'
		+ biggerTen(date.getSeconds());
	return date;
};

const broadcast = (obj) => {
	io.clients.forEach((client) => {

		if (client.readyState == 1) {
			client.send(JSON.stringify(obj));
		}
	});
};

//cb
const enterCb = (obj, socket) => {
	const sessionId = obj.sessionId;

	if (!sessionId) {
		return socket.send(JSON.stringify({
			type : 'refresh',
			message : '无法获取sessionId，强制刷新页面'
		}));
	}

	if (!obj.message) {
		return;
	}
	obj.date = getDate();

	broadcast(obj);
	MongoClient.connect(DB_CONN_STR, (err, db) => {
		console.log('mongodb新增了' + obj.name + '的消息记录：' + obj.message);
		insertData(db, obj, (err, result) => {

			if (err) {
				return console.log('mongodb error:' + err);
			}

			redisClient.set(sessionId, JSON.stringify({
				avatar : obj.avatar,
				name : obj.name,
				sessionId : sessionId
			}), (err, reply) => {

				if (err) {
					return console.log('redis error:' + err);
				}
				console.log('强行续一秒');
			});
			redisClient.expire(sessionId, 60 * 30);

			getOneCb(obj, socket);
		});
	});
};

const loginCb = (obj, socket) => {
	const sessionId = obj.sessionId;

	if (sessionId) {
		console.log(obj.name + '加入了聊天室...');
		redisClient.set(sessionId, JSON.stringify({
			avatar : obj.avatar,
			name : obj.name,
			sessionId : sessionId
		}), (err, reply) => {

			if (err) {
				return console.log('redis error:' + err);
			}

			obj.type = 'login';
			broadcast(obj);
			userList[sessionId] = {
				name : obj.name,
				avatar : obj.avatar
			};
			broadcast({
				type : 'userOnline',
				list : userList
			});
		});
		redisClient.expire(sessionId, 60 * 30);
	}
};

const uploadCb = (obj, socket) => {
	const sessionId = obj.sessionId;

	if (sessionId) {
		console.log(obj.name + '更新了头像');
		redisClient.set(sessionId, JSON.stringify({
			avatar : obj.avatar,
			name : obj.name,
			sessionId : sessionId
		}), (err, reply) => {

			if (err) {
				return console.log('redis error:' + err);
			}
			userList[sessionId].avatar = obj.avatar;
			broadcast({
				type : 'userOnline',
				list : userList
			});
		});
		redisClient.expire(sessionId, 60 * 30);
	}
};

const onloadCb = (obj, socket) => {
	const sessionId = obj.sessionId;

	if (sessionId) {
		redisClient.get(sessionId, (err, reply) => {

			if (err) {
				return console.log('redis error:' + err);
			}

			reply = JSON.parse(reply);

			if (reply) {
				reply.type = 'onload';
				broadcast(reply);
				console.log(reply.name + '加入了聊天室...');
				userList[sessionId] = {
					name : reply.name,
					avatar : reply.avatar
				};
			}
			
			broadcast({
				type : 'userOnline',
				list : userList
			});
		});

	}
};

const getOneCb = (obj, socket) => {
	const sessionId = obj.sessionId;

	if (sessionId) {
		obj.type = 'getOne';
		broadcast(obj);
	}
};

const getAllCb = (obj, socket) => {
	const sessionId = obj.sessionId;

	if (sessionId) {
		redisClient.get(sessionId, (err, reply) => {

			if (err) {
				return console.log('redis error:' + err);
			}

			MongoClient.connect(DB_CONN_STR, (err, db) => {

				if (err) {
					return console.log('mongodb start error:' + err);
				}

				getData(db, (result) => {

					if (err) {
						return console.log('mongodb error:' + err);
					}

					var data = {
						type : 'getAll',
						result : result
					}
					socket.send(JSON.stringify(data));
				});
			});
		});
	}
};

const refreshCb = (obj, socket) => {

	if (obj.masterKey == 'arnold.c.zhang') {
		console.log('管理员强制刷新页面...');
		broadcast({
			type : 'refresh',
			message : '页面服务端更新，强制刷新页面'
		});
	}
};

const closeCb = (obj, socket) => {
	const sessionId = obj.sessionId;

	if (sessionId) {
		console.log(obj.name + '离开了聊天室...');
		broadcast(obj);
		userList[sessionId] = null;
		broadcast({
			type : 'userOnline',
			list : userList
		});
	}
};

const userOnlineCb = (obj, socket) => {

	if (obj.sessionId) {
		broadcast({
			type : 'userOnline',
			list : userList
		});
	}
};

const sendImgCb = (obj, socket) => {
	const sessionId = obj.sessionId;

	if (sessionId) {
		obj.date = getDate();
		obj.type = 'sendImg';
		console.log(obj.name + '群发了图片');
		broadcast(obj);

		redisClient.set(sessionId, JSON.stringify({
			avatar : obj.avatar,
			name : obj.name,
			sessionId : sessionId
		}), (err, reply) => {

			if (err) {
				return console.log('redis error:' + err);
			}
			console.log('强行续一秒');
		});
		redisClient.expire(sessionId, 60 * 30);
	}
};

io.on('connection', (socket) => {
	
	//监听新用户加入
	socket.on('message', (obj) => {
		obj = JSON.parse(obj);
		switch (obj.type) {
			case 'enter' :
				enterCb(obj, socket);
				break;
			case 'login' :
				loginCb(obj, socket);
				break;
			case 'upload' :
				uploadCb(obj, socket);
				break;
			case 'onload' :
				onloadCb(obj, socket);
				break;
			case 'getAll' :
				getAllCb(obj, socket);
				break;
			case 'refresh' :
				refreshCb(obj, socket);
				break;
			case 'close' :
				closeCb(obj, socket);
				break;
			case 'getOne' :
				getOneCb(obj, socket);
				break;
			case 'userOnline' :
				userOnlineCb(obj, socket);
				break;
			case 'sendImg' :
				sendImgCb(obj, socket);
				break;
		};
	});
});