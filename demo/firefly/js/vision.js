window.URL = window.URL || window.webkitURL;
navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia || navigator.msGetUserMedia;
var vl = {};
vl.loaded = false;

vl.load = function(video) {
	vl.capture = video;
	if (navigator.getUserMedia) {
		navigator.getUserMedia( { audio: true, video: true }, function(stream) {
			vl.capture.src = window.URL.createObjectURL(stream);
			vl.init();
			vl.loaded = true;
		}, function(e) {
			console.log(e);
		} );
	}
	else {
		vl.capture.src = ''; // fallback.
	}
};

vl.init = function() {
	vl.capture.height = 60;
	vl.frameHeight = 60;
	vl.frameWidth = Math.floor(4 / 3 * vl.frameHeight);
	vl.gCurr = document.createElement('canvas').getContext('2d');
	vl.gPast = document.createElement('canvas').getContext('2d');
	vl.gDiff = document.createElement('canvas').getContext('2d');

	vl.gCurr.canvas.width = vl.frameWidth;
	vl.gCurr.canvas.height = vl.frameHeight;
	vl.gPast.canvas.width = vl.frameWidth;
	vl.gPast.canvas.height = vl.frameHeight;
	vl.gDiff.canvas.width = vl.frameWidth;
	vl.gDiff.canvas.height = vl.frameHeight;

	vl.frameCurr = null;
    vl.framePast = null;
    vl.frameDiff = vl.gDiff.createImageData(vl.frameWidth, vl.frameHeight);

	var vbox = document.querySelector('#vision');
	vbox.appendChild(vl.gCurr.canvas);
	//vbox.appendChild(vl.gPast.canvas);
	vbox.appendChild(vl.gDiff.canvas);
};

vl.update = function() {
	if(vl.loaded) {
		vl.gCurr.save();
		vl.gCurr.translate(vl.gCurr.canvas.width, 0);
		vl.gCurr.scale(-1, 1);
		vl.gCurr.drawImage(vl.capture, 0, 0, vl.frameWidth, vl.frameHeight);
		vl.gCurr.restore();

		// frame diff
		vl.frameCurr = vl.gCurr.getImageData(0, 0, vl.frameWidth, vl.frameHeight);
		vl.framePast = vl.gPast.getImageData(0, 0, vl.frameWidth, vl.frameHeight);
		var i, x, y, pos, diff, fill, ycnt;
		for(x = 0; x < vl.frameWidth; x++) {
			ycnt = 0;
			for(y = 0; y < vl.frameHeight; y++) {
				i = y * vl.frameWidth + x;
				pos = 4 * i;
				diff = vl.frameCurr.data[pos] - vl.framePast.data[pos];
	            diff = diff > 0 ? diff : -diff;
	            if(diff > 32) {
	            	fill = 255;
	            	ycnt++;
	            }
	            else {
	            	fill = 0;
	            }
	            vl.frameDiff.data[pos] = fill;
	            vl.frameDiff.data[pos + 1] = fill;
	            vl.frameDiff.data[pos + 2] = fill;
	            vl.frameDiff.data[pos + 3] = 255;
        	}
        	if(ycnt / vl.frameHeight > 0.1) {
        		if(tendrils.length > 0) {
					var j, t;
					for(j = 0; j < tendrils.length; j++) {
						t = tendrils[j];
						t.impact(x / vl.frameWidth * window.innerWidth);
					}			
				}
        	}
        	if(ycnt / vl.frameHeight > 0.7) {
        		fire();
        	}
		}
		vl.gDiff.putImageData(vl.frameDiff, 0 ,0);
		//--

		vl.gPast.drawImage(vl.gCurr.canvas, 0, 0, vl.frameWidth, vl.frameHeight);
	}
};