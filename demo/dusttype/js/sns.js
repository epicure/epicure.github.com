var loadFromXHR = function(url, responseType, callback) {
	var xhr = new XMLHttpRequest();
	xhr.responseType = responseType;
	xhr.open('POST', url, true);
	xhr.onload = function(e) {
		callback(e.target.response);
	};
	xhr.send();
};

var jsonp = {
	count: 0,
	cbs: {},
	load: function(q, url, callback) {
		var self = this;
		
		var fname = 'fn' + self.count++;

		self.cbs[fname] = function(res) {
			callback(q, res);
			document.head.removeChild(document.querySelector('#' + fname));
			if(self.cbs[fname]) {
				delete self.cbs[fname];
			}
		}

		var s = document.createElement('script');
		s.src = url + '&callback=jsonp.cbs.' + fname;
		s.id = fname;
		document.head.appendChild(s);
	}
};

var tw_feed = {};

var parseTwitterFeed = function(q, feed) {
	//console.log('tw: ' + q);
	if(!tw_feed[q]) {
		tw_feed[q] = [];
	}

	//console.log(JSON.stringify(feed));

	if(feed) {
		var i, j;
		for(i = 0; i < feed.results.length; i++) {
			var ct = false;
			for(j = 0; j < tw_feed[q].length; j++) {
				if(tw_feed[q][j].id == feed.results[i].id) {
					ct = true;
				}
			}
			if(!ct) {
				tw_feed[q].unshift(feed.results[i]);

				//---
				/*
				var n = randomi(0, ptcls.length - 1);
				var ptcl = ptcls[n];
				if(ptcl != theone) {
					ptcl.elname.textContent = feed.results[i].from_user;
					ptcl.elkey.textContent = q;
					ptcl.mesg = feed.results[i].text;
					ptcl.key = q;
				}
				*/
				var twbox = ''
					+ '<img class="tw-profile" src="$1">'
					+ '<div class="tw-name">$2</div>'
					+ '<div class="tw-text">$3</div>';

				twbox = twbox.replace('$1', feed.results[i].profile_image_url);
				twbox = twbox.replace('$2', feed.results[i].from_user_name);
				twbox = twbox.replace('$3', feed.results[i].text);

				var t = document.createElement('div');
				t.className = 'tw-box';
				t.innerHTML = twbox;
				t.tweet = feed.results[i];
				if(t.tweet.entities.media) {
					t.style['background-color'] = 'rgba(255, 0, 255, 0.6)';
				}
				document.querySelector('#tw-area').appendChild(t);

				//---

				if(tw_feed[q].length > 50) {
					tw_feed[q].pop();
				}
			}
		}
	}
};

var fetchQuery = function(q, rpp) {
	var tw_q_url = 'http://search.twitter.com/search.json?include_entities=true&rpp=' + rpp + '&q=' + q;

	//loadFromXHR(tw_q_url, 'text', parseTwitterFeed);
	jsonp.load(q, tw_q_url, parseTwitterFeed);
};

var removeTest = function() {
	var el = document.querySelector('.tw-box');
	el.style['height'] = '0px';
};

window.onwebkittransitionend = function(e) {
	if(e.target.className == 'tw-box') {
		if(e.target.dataset.rm) {
			e.target.parentElement.removeChild(e.target);
		}
	}
};

var sns_query = 'twitter';
var sns_loop = function() {
	if(frameCount % (60 * 10) == 0) {
		fetchQuery(sns_query, 12);
	}

	if(frameCount % 10 == 0 && document.querySelector('#tw-area').childNodes.length > 12) {
		var el = document.querySelector('.tw-box');
		el.dataset.rm = true;
		el.style['height'] = '0px';
	}
};