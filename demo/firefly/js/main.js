var c, gl;
var tendrils = [];
var bandis = [];

var ef_tendril, ef_bandi;
var m_proj, m_view;
var tex_bandi = null;
var vb_quad, tb_quad;

var readyStatus = 0;

var guide = document.createElement('canvas').getContext('2d');
var guide_data = null;
var guide_pts = [];
var guide_imgs = [];
var guide_index = 0;

var frameCount = 0;

var initgl = function(gl) {
	var vs_str = document.querySelector('#vs_tendril').textContent;
	var fs_str = document.querySelector('#fs_tendril').textContent;
	
	ef_tendril = new Effect(gl);
	ef_tendril.compile(vs_str, fs_str);
	ef_tendril.getAttribLocation('position');
	ef_tendril.getUniformLocation('proj', 'view', 'model', 'hsb');

	vs_str = document.querySelector('#vs_bandi').textContent;
	fs_str = document.querySelector('#fs_bandi').textContent;

	ef_bandi = new Effect(gl);
	ef_bandi.compile(vs_str, fs_str);
	ef_bandi.getAttribLocation('position', 'texCoord');
	ef_bandi.getUniformLocation('proj', 'view', 'model', 'map', 'fpsr', 'pos', 'opacity');

	var vertices = new Float32Array([
		-1, 1,
		1, 1,
		-1, -1,
		1, -1
	]);

	vb_quad = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vb_quad);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	var texCoords = new Float32Array([
		0, 0,
		1, 0,
		0, 1,
		1, 1
	]);

	tb_quad = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tb_quad);
	gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

	m_view = mat4.lookAt([0,0,10], [0,0,0], [0, 1, 0]);
	m_proj = mat4.ortho(0, c.width, c.height, 0, 0.01, 100);

	gl.useProgram(ef_tendril.program);
	gl.uniformMatrix4fv(ef_tendril.u.proj, false, m_proj);
	gl.uniformMatrix4fv(ef_tendril.u.view, false, m_view);

	gl.useProgram(ef_bandi.program);
	gl.uniformMatrix4fv(ef_bandi.u.proj, false, m_proj);
	gl.uniformMatrix4fv(ef_bandi.u.view, false, m_view);

	gl.viewport(0, 0, c.width, c.height);
	gl.clearColor(0, 0, 0, 1);
};

var do_once = function() {
	initgl(gl);

	var j, cx, t;
	for(j = 0; j < 200; j++) {
		t = new Tendril();
		if(random(0, 1) < 0.2) {
			t.make(random(2, 4), 20, 10, random(1, 3));	
		}
		else {
			t.make(random(1, 3), random(10, 15), random(8, 10), random(1, 3));	
		}
		cx = randomi(0, c.width);
		t.bake(gl);
		t.pos = [cx, c.height + 20, 0];
		t.rot = 0;
		t.to_hsb[0] = random(0.3, 0.5);
		t.to_hsb[1] = random(0.9, 1);
		t.to_hsb[2] = random(0.6, 1);
		tendrils.push(t);
	}

	var b;
	for(j = 0; j < 500; j++) {
		b = new Bandi(gl);
		var theta = random(0, Math.PI * 2);
		b.pos[0] = c.width * 0.5 + c.height * 0.25 * Math.cos(theta);
		b.pos[1] = c.height * 0.5 + c.height * 0.25 * Math.sin(theta);
		b.tendrils = tendrils;
		b.impact();
	
		bandis.push(b);
	}
};

var fill_guide = function() {
	guide_pts = [];
	guide_data = guide.getImageData(0, 0, guide.canvas.width, guide.canvas.height);
	var i, x, y, pos;
	for(y = 0; y < guide_data.height; y++) {
		for(x = 0; x < guide_data.width; x++) {
			i = y * guide_data.width + x;
			pos = 4 * i;
			if(guide_data.data[pos] > 0) {
				guide_pts.push( { x: x, y: y });
			}
		}
	}
};

var init_guide = function() {
	guide.canvas.id = "guide";
	guide.canvas.height = 200;
	guide.canvas.width = Math.floor(c.width / c.height * guide.canvas.height);

	var str = 'f i r e f l y';
	guide.font = '40px serif';
	guide.textAlign = 'center';
	guide.textBaseline = 'middle';
	guide.fillStyle = 'white';
	guide.fillText(str, guide.canvas.width * 0.5, guide.canvas.height * 0.5);

	fill_guide();

	for(i = 1; i <= 7; i++) {
		var img = document.createElement('img');
		img.src = './img/c' + i + '.png';
		guide_imgs.push(img);
	}
};

var select_guide = function(n) {
	var img = guide_imgs[n];

	guide.fillStyle = 'black';
	guide.fillRect(0, 0, guide.canvas.width, guide.canvas.height);
	guide.drawImage(img, guide.canvas.width * 0.5 - img.width * 0.5, 0);

	fill_guide();
};

var fire = function() {
	var n;
	for(i = 0; i < bandis.length; i++) {
		b = bandis[i];
		b.bTendril = null;
		n = randomi(0, guide_pts.length - 1);

		b.free = false;
		b.tp[0] = guide_pts[n].x / guide_data.width * window.innerWidth;
		b.tp[1] = guide_pts[n].y / guide_data.height * window.innerHeight;
		b.energy = 600;
		b.dt = 0.01;
		b.to_opacity = 0.5;
	}

	if(frameCount > 300) {
		var n = randomi(0, guide_imgs.length - 1);
		select_guide(n);
	}
};

var init = function() {
	c = document.querySelector('#c');
	c.width = window.innerWidth;
	c.height = window.innerHeight;
	gl = c.getContext('experimental-webgl');

	var img_bandi = document.createElement('img');
	img_bandi.src = './texture/bandi.png';
	img_bandi.onload = function(e) {
		tex_bandi = createTexture(gl, img_bandi);
		readyStatus = 1;
	};

	init_guide();

	vl.load(document.querySelector('#capture'));
};

var update = function() {
	var i, t, b;

	for(i = 0; i < tendrils.length; i++) {
		t = tendrils[i];
		t.update();
	}

	for(i = 0; i < bandis.length; i++) {
		b = bandis[i];
		b.update();
	}

	frameCount++;
};

var draw = function() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var i, t;

	gl.disable(gl.BLEND);
	gl.useProgram(ef_tendril.program);
	gl.enableVertexAttribArray(ef_tendril.a.position);
	for(i = 0; i < tendrils.length; i++) {
		t = tendrils[i];
		t.draw(gl, ef_tendril);
	}
	
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.useProgram(ef_bandi.program);

	gl.enableVertexAttribArray(ef_bandi.a.position);
	gl.enableVertexAttribArray(ef_bandi.a.texCoord);
	
	gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex_bandi);
	gl.uniform1i(ef_bandi.u.map, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, vb_quad);
	gl.vertexAttribPointer(ef_bandi.a.position, 2, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, tb_quad);
	gl.vertexAttribPointer(ef_bandi.a.texCoord, 2, gl.FLOAT, false, 0, 0);
	
	var j = 0;
	while(j < bandis.length) {
		b = bandis[j++];
		b.draw(gl, ef_bandi);
	}
};

var loop = function() {
	if(readyStatus == 1) {
		do_once();
		readyStatus = 2;
	}
	if(readyStatus == 2) {
		vl.update();
		update();
		draw();
	}
	webkitRequestAnimationFrame(loop);
};

window.onload = function() {
	init();
	loop();
};

window.onmousemove = function(e) {
	if(tendrils.length > 0) {
		var i, t;
		for(i = 0; i < tendrils.length; i++) {
			t = tendrils[i];
			t.impact(e.clientX);
		}			
	}
};

window.onkeydown = function(e) {
	if(e.keyCode == 32) {
		select_guide(6);
	}
	switch(e.keyCode) {
		case 49: // D1
			select_guide(0);
			fire();
			break;
		case 50: // D2
			select_guide(1);
			fire();
			break;
		case 51: // D3
			select_guide(2);
			fire();
			break;
		case 52: // D4
			select_guide(3);
			fire();
			break;
		case 53: // D5
			select_guide(4);
			fire();
			break;
		case 54: // D6
			select_guide(5);
			fire();
			break;
		case 55: // D7
			select_guide(6);
			fire();
			break;
	}
	console.log(e.keyCode);
};