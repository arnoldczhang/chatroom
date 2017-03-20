var socket = new WebSocket('ws://' + location.host + ':3000/socket');
var defaultImg = 'http://pics.lvjs.com.cn/mobile/zt/3.0.0/img/loading.png';
var defaultName = '匿名';
var USER = {
	name : defaultName,
	avatar : defaultImg,
	message : '',
	historyFlag : false
};
var TOP = 95 + 30 + 20;
var LEFT;
var myAvatar;
var msgBox = document.getElementsByClassName('msgBox')[0];
var enterInput = document.getElementById('enterInput');
var nameInput = document.getElementById('nameInput');
var picInput = document.getElementById('picInput');
var showHistory = document.getElementById('showHistory');
var historyBox = document.getElementById('historyBox');
var historyBoxNav = document.getElementById('historyBoxNav');
var historyTitle = document.getElementById('historyTitle');
var bigImg = document.getElementById('bigImg');
var sendImg = document.getElementById('sendImg');
var sendEmo = document.getElementById('sendEmo');
var emoUl = document.getElementById('emo_ul');
var sendImgInput = document.getElementById('sendImgInput');
var fakeChooseImg = document.getElementById('fakeChooseImg');
var myAvatarInWord = document.getElementsByClassName('myAvatar_in_word');

//默认
enterInput.classList.add('show');

if (window.Notification) {

    if (Notification.permission == "granted") {
        ;
    } 

    else if (Notification.permission != "denied") {
        Notification.requestPermission(function (permission) {
          ;
        });
    }

    function pushNotification (data) {
        var notification = new Notification(data.name + ' 说：', {
            body: data.message || '[图 片]',
            icon: data.avatar || defaultImg
        });

        notification.onclick = function (e) {
        	window.focus();
        	notification.close();
        };

        setTimeout(function () {
        	notification.close();
        }, 5000);
    };

} else {
    alert('请使用正常浏览器，谢谢');
}

function initialEmo () {
	var EMOLEN = 132;
	var html = '';

	for (var i = 1; i < EMOLEN; ++i) {
		var src = 'public/images/QQexpression/' + i + '.gif';
		html += '<li><img src="' + src + '" data-img="' + src + '"/></li>';
	}
	emoUl.innerHTML = html;
	emoUl.onclick = function (e) {
		var url = e.target.getAttribute('data-img');

		if (url) {
			socket.send(JSON.stringify({
				type : 'sendImg',
				sessionId : USER.sessionId,
				name : USER.name,
				avatar : USER.avatar,
				image : url
			}));
			sendImgFn(url, true);
		}
		
	};
}

function showImg (e) {
	var src = e.target.getAttribute('data-img');
	bigImg.src = src;
	var nH = bigImg.naturalHeight;
	var nW = bigImg.naturalWidth;
	var tH, tW;

	if (nH >= nW) {
		bigImg.style.height = (tH = Math.min(bigImg.naturalHeight, 650)) + 'px';
		bigImg.style.width = (tW = tH * nW / nH) + 'px';
	}

	else {
		bigImg.style.width = (tW = Math.min(bigImg.naturalWidth, 500)) + 'px';
		bigImg.style.height = (tH = tW * nH / nW) + 'px';
	}
	LEFT = +getComputedStyle(mainBody, null).getPropertyValue('margin-left').slice(0, -2) + 20;
	bigImg.style.top = ((685 - tH) /2) + 'px';
	bigImg.style.left = ((530 - tW) /2) + 'px';
	bigImg.classList.add('show');
};

function connectSocket () {

	//
	socket.onopen = function (e) {
		USER.sessionId = localStorage.getItem('wssessionId');

		if (!USER.sessionId) {
			USER.sessionId = 'ws' + String(Math.random()).replace(/\./, '');
			localStorage.setItem('wssessionId', USER.sessionId);
		}

		socket.send(JSON.stringify({
			type : 'onload',
			sessionId : USER.sessionId
		}));

		socket.onmessage = function (event) { 
			var data = JSON.parse(event.data);
			var cbMap = {
				enter : enterCb,
				login : loginCb,
				onload : onloadCb,
				refresh : refreshCb,
				close : closeCb,
				getAll : getAllCb,
				getOne : getOneCb,
				userOnline : userOnlineCb,
				sendImg : sendImgCb
			};
			cbMap[data.type](data);
		}; 
	};

	//
	socket.onclose = function(e) {
		socket.send(JSON.stringify({
			type : 'close',
			name : USER.name,
			sessionId : USER.sessionId
		}));
		console.log("无法连接websocket");
	};

	//
	function enterCb (data) {
		var firstChild = msgBox.firstChild;
		var isSelf = USER.sessionId == data.sessionId;

		if (isSelf) return;
	 	var p = document.createElement('p');
	 	p.textContent = data.date + '  ' + data.name;
	 	p.className = 'notify_enter';
	 	msgBox.appendChild(p);

	 	var section = document.createElement('section');
	 	section.className = 'mySection';
	 	var p2 = document.createElement('p');
	 	p2.className = 'word';
	 	p2.textContent = data.message;

	 	if(data.avatar) {
	 		var img = document.createElement('img');
	 		img.className = 'img';
	 		img.src = data.avatar;
	 		img.setAttribute('data-sessionid', data.sessionId);
	 		img.setAttribute('data-img', data.avatar);

	 		if (isVip(data)) {
	 			img.className += ' vipImg';
	 		}
	 		img.ondblclick = showImg;
	 		
	 		section.appendChild(img);
	 		section.appendChild(p2);
	 	}

	 	else {
	 		section.appendChild(p2);
	 	}

	 	msgBox.appendChild(section);
	 	section.scrollIntoView();
	 	(window.outerWidth < 200 || document.hidden || !ACTIVE) && pushNotification(data);
	};

	function loginCb (data) {

		if (data.sessionId != USER.sessionId) {
			var p = document.createElement('p');
			p.textContent = data.name + ' 加入了聊天室';
			p.className = 'notify_enter';
			msgBox.appendChild(p);
		}
	};

	function onloadCb (data) {

		if (data.sessionId != USER.sessionId) {
			loginCb(data);
		}

		else {

			if (data.name) {
				USER.name = data.name;
				USER.hasName = true;
				USER.avatar = data.avatar;

				if (nameInput.parentNode) {
					var p = document.createElement('p');
					p.textContent = data.name + ' ';
					p.className = 'nameP';
					p.appendChild(fakeChooseImg);

					myAvatar = document.createElement('img');
					myAvatar.src = USER.avatar;
					myAvatar.className = 'img';
					nameInput.parentNode.insertBefore(myAvatar, nameInput);
					nameInput.parentNode.replaceChild(p, nameInput);
				}
			}
		}
	};

	function refreshCb (data) {

		if (data.message) {
			alert(data.message);
		}
		location.reload();
	};

	function closeCb (data) {

		if (data.sessionId != USER.sessionId) {
			var p = document.createElement('p');
			p.textContent = data.name + ' 离开了聊天室';
			p.className = 'notify_enter';
			msgBox.appendChild(p);
		}
	};

	function getOneCb (data) {

		if (USER.historyFlag) {
			var li = document.createElement('li');
			var p = document.createElement('p');
			p.textContent = data.date + '   ' + data.name;
			p.className = 'notify_enter pd0';
			li.appendChild(p);

			var p = document.createElement('p');
			p.textContent = data.message;
			p.className = 'notify_enter pd0';
			li.appendChild(p);
			historyBoxNav.appendChild(li);
			li.scrollIntoView();
		}
	};

	function getAllCb (data) {
		var result = data.result;
		historyBoxNav.innerHTML = '';
		result.forEach(function (obj) {
			var li = document.createElement('li');

			var p = document.createElement('p');
			p.className = 'notify_enter pd0';
			p.textContent = obj.date + '   ' + obj.name;
			li.appendChild(p);

			var p = document.createElement('p');
			p.textContent = obj.message;
			p.className = 'notify_enter pd0';
			li.appendChild(p);
			historyBoxNav.appendChild(li);
			li.scrollIntoView();
		});
	};

	function userOnlineCb (data) {

		if (USER.historyFlag) {
			return;
		}
		var result = data.list;
		historyBoxNav.innerHTML = '';

		for (var key in result) {
			var user = result[key];

			if (user && user.name) {
				var li = document.createElement('li');
				var img = document.createElement('img');
				var p = document.createElement('p');
				img.src = user.avatar;
				img.setAttribute('data-img', img.src);
				img.className = 'img';

				if (isVip(user)) {
					img.className += ' vipImg';
				}
				img.ondblclick = showImg;
				li.appendChild(img);
				p.textContent = user.name;
				p.className = 'nameP';
				li.appendChild(p);
				historyBoxNav.appendChild(li);

				var imgs = document.querySelectorAll('img[data-sessionId="' + key + '"]');

				if (imgs.length) {
					imgs = [].slice.call(imgs);
					imgs.forEach(function (img) {
						img.src = user.avatar;
						img.setAttribute('data-img', img.src);
					});
				}
			}
		}
	};

	function sendImgCb (data) {
		var isSelf = USER.sessionId == data.sessionId;
		if (isSelf) return;
		sendImgFn(data.image, false, data);
	 	(window.outerWidth < 200 || document.hidden || !ACTIVE) && pushNotification(data);
	};
};

function convertImg (blob, callback, el) {
	var MAX = 1024 * 1024;
	var size = blob.size;
	var partio = MAX / size;

	if (size > MAX * 5) {
		alert('单张图片最大不超过5M');
		return el.value = '';
	}

	if (partio >= 1) {
		var reader = new FileReader();
		reader.onload = function () {
			callback.call(this, reader.result);
		};
		reader.readAsDataURL(blob);
	}

	else {
		if (window.URL) {
			var url = window.URL.createObjectURL(blob);
			var canvas = document.createElement('CANVAS'),
				ctx = canvas.getContext('2d'),
				img = new Image;
			img.crossOrigin = 'Anonymous';
			img.onload = function() {
				canvas.height = img.height;
				canvas.width = img.width;
				ctx.drawImage(img, 0, 0);
				var dataURL = canvas.toDataURL(blob.type || 'image/png', Math.min(partio, 1));
				callback.call(this, dataURL);
				canvas = null;
			};
			img.src = url;
		}
	}
};

function sendImgFn (url, isSelf, data) {
	data = data || USER;
 	var p = document.createElement('p');
 	date = data.date || getDate();
 	p.textContent = date + (isSelf ? '' : '  ' + data.name);
 	p.className = 'notify_enter';
 	msgBox.appendChild(p);

 	var section = document.createElement('section');
 	section.className = 'mySection';
 	var p2 = document.createElement('p');
 	p2.className = isSelf ? 'myword' : 'word';

 	var img = document.createElement('img');
 	img.src = url;
 	img.setAttribute('data-img', url);
 	img.ondblclick = showImg;
 	img.style.maxWidth = '170px';
 	p2.appendChild(img);

 	if(data.avatar) {
 		var img = document.createElement('img');
 		img.className = 'img';
 		img.src = data.avatar;
 		img.setAttribute('data-sessionid', data.sessionId);
 		img.setAttribute('data-img', data.avatar);

 		if (isSelf) {
 			p2.className += ' fr';
 			img.className += ' fr';
 			img.className += " myAvatar_in_word";
 		}

 		if (isVip(data)) {
 			img.className += ' vipImg';
 		}
 		
 		img.ondblclick = showImg;
 		section.appendChild(img);
 		section.appendChild(p2);
 	}

 	else {
 		section.appendChild(p2);
 	}

 	msgBox.appendChild(section);
 	section.scrollIntoView();
};

connectSocket();
initialEmo();

sendImgInput.onchange = function (e) {
	var el = e.target;
	var len = el.files.length;

	if (len > 5) {
		return alert('上传图片不要超过5张');
	}

	for (var i = 0; i < len; ++i) {
		convertImg(el.files[i], function (url) {
			socket.send(JSON.stringify({
				type : 'sendImg',
				sessionId : USER.sessionId,
				name : USER.name,
				avatar : USER.avatar,
				image : url
			}));
			sendImgFn(url, true);
		}, el);
	}
	this.value = '';
};

picInput.onchange = function (e) {
	var el = e.target;
	convertImg(el.files[0], function (url) {
		USER.avatar = url;

		if (USER.name != defaultName) {
			socket.send(JSON.stringify({
				type : 'upload',
				sessionId : USER.sessionId,
				avatar : USER.avatar,
				name : USER.name
			}));
			[].slice.call(myAvatarInWord).forEach(function (img) {
				img.src = USER.avatar;
				img.setAttribute('data-img', img.src);
			})
			myAvatar && (myAvatar.src = USER.avatar);
		}
	}, el);
	this.value = '';
};

enterInput.onkeypress = function (e) {
	var code = e.charCode || e.keyCode;
	if (isEnter(code)) {

		if (e.ctrlKey) {
			return this.value += '\r';
		}

		e.preventDefault();

		if (!this.value || /^\s+$/.test(this.value)) {
			this.value = '';
			return alert('不能发送空白信息');
		}

		socket.send(JSON.stringify({
			type : 'enter',
			avatar : USER.avatar,
			name : USER.name,
			sessionId : USER.sessionId,
			message : this.value
		}));

		var firstChild = msgBox.firstChild;
		date = getDate();

	 	var p = document.createElement('p');
	 	p.textContent = date;
	 	p.className = 'notify_enter';
	 	msgBox.appendChild(p);

	 	var section = document.createElement('section');
	 	section.className = 'mySection';
	 	var p2 = document.createElement('p');
	 	p2.className = 'myword';
	 	p2.innerHTML = this.value.replace(/[\r|\n\f]+/g, '<br />');

	 	if(USER.avatar) {
	 		var img = document.createElement('img');
	 		img.className = 'img';
	 		img.src = USER.avatar;
	 		img.setAttribute('data-img', USER.avatar);
	 		p2.className += ' fr';
	 		img.className += ' fr';
	 		img.ondblclick = showImg;
	 		img.className += " myAvatar_in_word";

	 		if (isVip(USER)) {
	 			img.className += ' vipImg';
	 		}
	 		section.appendChild(img);
	 		section.appendChild(p2);
	 	}

	 	else {
	 		section.appendChild(p2);
	 	}

	 	msgBox.appendChild(section);
	 	section.scrollIntoView();
		this.value = '';
	}
};

nameInput.onkeypress = function (e) {
	var code = e.charCode || e.keyCode;

	if (isEnter(code)) {
		e.preventDefault();

		if (!this.value) {
			return alert('名字不可为空');
		}

		if (this.value == defaultName) {
			return alert('不能取默认名字');
		}
		var value = this.value;
		USER.name = value;
		USER.hasName = true;
		socket.send(JSON.stringify({
			type : 'login',
			sessionId : USER.sessionId,
			avatar : USER.avatar,
			name : value
		}));

		myAvatar = document.createElement('img');
		myAvatar.src = USER.avatar;
		myAvatar.className = 'img';

		if (isVip(USER)) {
			myAvatar.className += ' vipImg';
		}
		this.parentNode.insertBefore(myAvatar, this);

		var p = document.createElement('p');
		p.textContent = value + ' ';
		p.className = 'nameP';
		p.appendChild(fakeChooseImg);
		this.parentNode.replaceChild(p, this);
	}
};

showHistory.onclick = function (e) {
	USER.historyFlag = !USER.historyFlag;
	this.textContent = USER.historyFlag ? '在线成员' : '消息记录';
	historyTitle.textContent = USER.historyFlag ? '消息记录' : '在线成员';
	historyBoxNav.innerHTML = '';

	if (USER.historyFlag) {
		socket.send(JSON.stringify({
			type : 'getAll',
			sessionId : USER.sessionId
		}));
	}

	else {
		socket.send(JSON.stringify({
			type : 'userOnline',
			sessionId : USER.sessionId
		}));
	}
};

bigImg.onclick = function (e) {
	this.classList.remove('show');
};

sendImg.onclick = function (e) {
	sendImgInput.click(e);
};

sendEmo.onclick = function (e) {
	this.textContent = this.textContent == '文字' ? '表情' : '文字';

	if (this.textContent == '文字') {
		enterInput.classList.remove('show');
		emoUl.classList.add('show');
	}

	else {
		enterInput.classList.add('show');
		emoUl.classList.remove('show');
	}
};

fakeChooseImg.onclick = function (e) {
	picInput.click(e);
};

window.onbeforeunload = function (event) {

	if (USER.name != defaultName) {
		socket.send(JSON.stringify({
			type : 'close',
			name : USER.name,
			sessionId : USER.sessionId
		}));
		return '退出';
	}
};

function getDate() {
	var date = new Date;
	date = date.getFullYear() + '-'
		+ biggerTen(date.getMonth() + 1) + '-' 
		+ biggerTen(date.getDate()) + ' ' 
		+ biggerTen(date.getHours()) + ':' 
		+ biggerTen(date.getMinutes()) + ':'
		+ biggerTen(date.getSeconds());

	function biggerTen (value) {
		return value >= 10 ? value : '0' + value;
	};

	return date;
};

function isEnter (code) {
	return code == 10 || code == 13;
};

function isVip(data) {
	return data.name == '熊猫人';
};