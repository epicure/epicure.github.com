var frameCount = 0;

var g = null;
var bg_opacity = 0.5;

var splitText = function(ctx, str, width) {
	var looping, pos, len, phrase, w, lines;
	go = true;
	pos = 0;
	len = 1;
	phrase = '';
	lines = [];
	w = ctx.measureText(str).width;
	if(w < width) {
		lines.push(str.trim());
	}
	else {
		while(go) {
			phrase = str.substr(pos, len);
			w = ctx.measureText(phrase).width;
			if(w > width) {
				lines.push(phrase.substr(0, len - 1).trim());
				pos += len - 1;
				len = 1;
			}

			if(pos + len == str.length) {
				if(phrase.length > 0) {
					lines.push(phrase.trim());
				}
				go = false;
			}

			len++;
		}
	}

	return lines;
};

var urlexp = new RegExp( '(http|ftp|https)://[\\w-]+(\\.[\\w-]+)+([\\w-.,@?^=%&:/~+#-]*[\\w@?^=%&;/~+#-])?' );
var media_img;

var loop = function() {
	scene_update();
	scene_draw();
	sns_loop();

	frameCount++;
	webkitRequestAnimationFrame(loop);
};

window.onload = function(e) {
	g = document.querySelector('#b').getContext('2d');
	media_img = document.querySelector('#media');
	scene_init();
	loop();

	show_twarea = false;
	document.querySelector('#tw-area').style['right'] = -496 + 'px';
};

window.onresize = function(e) {
	scene_layout();
};

window.onmousemove = function(e) {
	if(gl) {
		cam.to_pos[0] = (0.5 - e.clientX / gl.canvas.width) * 50;
		cam.to_pos[1] = (e.clientY / gl.canvas.height - 0.5) * 50;
		cam.to_pos[2] = 30;
	}
};

var open_url = '';
window.onmousedown = function(e) {
	var el = null;
	switch(e.target.className) {
		case 'tw-box':
			el = e.target;
			break;
		case 'tw-profile':
			el = e.target.parentElement;
			break;
		case 'tw-name':
			el = e.target.parentElement;
			break;
		case 'tw-text':
			el = e.target.parentElement;
			break;
	}

	if(el) {
		takeTweet(el.tweet);
	}
};

var takeTweet = function(tweet) {
	var name = tweet.from_user_name;
	var text = tweet.text;
	reset_dust(name, text);

	if(urlexp.test(text)) {
		var result = urlexp.exec(text);
		open_url = result[0];
	}
	else {
		open_url = null;
	}	

	var i;
	if(tweet.entities.media) {
		for(i = 0; i < tweet.entities.media.length; i++) {
			media_img.src = tweet.entities.media[i].media_url;
			media_img.onload = function(e) {
				var canvas = document.querySelector('#c');
				media_img.style['left'] = (canvas.width * 0.5 - media_img.width * 0.5) + 'px';
				media_img.style['top'] = (canvas.height * 0.5 - media_img.height * 0.5) + 'px';
			}
		}
	}
	else {
		media_img.style['opacity'] = 0;
	}
};

var show_img = false;
var show_config = false;
var show_twarea = true;
window.onkeydown = function(e) {
	//console.log(e.keyCode);
	switch(e.keyCode) {
		case 56: // 8
			document.body.style['background-color'] = random_hsl_string([0, 360], [100, 100], [10, 30]);
			break;
		case 57: // 9
			document.body.style['background-color'] = 'black';
			break;
		case 65: // a
			auto_pilot = !auto_pilot;
			break;
		case 48: // 0
			show_config = !show_config;
			if(show_config) {
				document.querySelector('#config').style['visibility'] = 'visible';
			}
			else {
				document.querySelector('#config').style['visibility'] = 'hidden';
			}
			break;
		case 32: // space
			perturb();
			break;
		case 38: // up
			bg_opacity += 0.25;
			if(bg_opacity > 1) {
				bg_opacity = 1;
			}
			break;
		case 40: // down
			bg_opacity -= 0.25;
			if(bg_opacity < 0) {
				bg_opacity = 0;
			}
			break;
		case 37: // left
			show_twarea = true;
			document.querySelector('#tw-area').style['right'] = 0 + 'px';
			//document.querySelector('#tw-area').style['-webkit-transform'] = 0 + 'px';
			break;
		case 39: // right
			show_twarea = false;
			document.querySelector('#tw-area').style['right'] = -496 + 'px';
			//document.querySelector('#tw-area').style['-webkit-transform'] = -496 + 'px';
			break;
		case 49: // 1
			sns_query = document.querySelector('#q1').value;
			break;
		case 50: // 2
			sns_query = document.querySelector('#q2').value;
			break;
		case 51: // 3
			sns_query = document.querySelector('#q3').value;
			break;
		case 13: // enter
			if(tw_feed[sns_query]) {
				while(tw_feed[sns_query].length > 0) {
					tw_feed[sns_query].pop();
				}
			}
			fetchQuery(sns_query, 12);
			break;
		case 82: // r
			random_select();
			break;
		case 87: // w
			show_img = !show_img;
			if(show_img) {
				media_img.style['opacity'] = 1;
			}
			else {
				media_img.style['opacity'] = 0;
			}
			break;
		case 38: // up
			bg_opacity += 0.25;
			if(bg_opacity > 1) {
				bg_opacity = 1;
			}
			break;
		case 90: // z
			dust_to_alpha -= 0.25;
			if(dust_to_alpha < 0) {
				dust_to_alpha = 0;
			}
			break;
		case 88: // x
			dust_to_alpha += 0.25;
			if(dust_to_alpha > 1) {
				dust_to_alpha = 1;
			}
			break;
		case 67: // c
			to_tp_alpha -= 0.25;
			if(to_tp_alpha < 0) {
				to_tp_alpha = 0;
			}
			break;
		case 86: // v
			to_tp_alpha += 0.25;
			if(to_tp_alpha > 1) {
				to_tp_alpha = 1;
			}
			break;
		case 66: // b
			dust_to_alpha = 1;
			to_tp_alpha = 0;
			break;
		case 78: // n
			dust_to_alpha = 0;
			to_tp_alpha = 1;
			break;
		case 77: // m
			dust_to_alpha = 1;
			to_tp_alpha = 1;
			break;
		case 83: // s
			arrangeTS();
			break;
		case 68: // d
			arrangeTD();
			break;
		case 70: // f
			arrangeTF();
			break;
		case 71: // g
			arrangeTG();
			break;
		case 72: // h
			arrangeTH();
			break;
	}
};