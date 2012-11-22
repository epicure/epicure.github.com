var gl, ctx, ctx2;
var rail, ef_rail;
var logo, ef_logo;
var dust, ef_dust;
var sia_map;

var frameCount = 0;

var ps = [];
var ts = [];
var bs = [];

var cam = {
	pos: [0, 0, 50],
	to_pos: [0, 0, 50],
	target: [0, 0, 0],
	up: [0, 1, 0]
}

var cam_logo = {
	pos: [0, 0, 50],
	to_pos: [0, 0, 50],
	target: [0, 0, 0],
	up: [0, 1, 0]
}

var camcnt = 0;

var dust_vertices = [];
var dust_colors = [];
var to_dust_verts = [];
var to_dust_colors = [];
var v_dust_verts = [];
var dust_limit = 10000;
var dust_dt = 0.05;
var dust_to_alpha = 0.75, dust_alpha = 0;

var pointSize, to_pointSize;

var projMatrix, viewMatrix, viewprojMatrix, temp_mats;
var ef_tquad, tquad;
var tptcls = [];
var last_tp = null;
var to_tp_alpha = 1, tp_alpha = 0;
var auto_pilot = true;

var logo_init = function(model) {
	var i, k;
	k = 0;
	var faces = [];
	for(i = 0; i < model.faces.length / 11; i++) {
		faces[k++] = model.faces[11 * i + 1];
		faces[k++] = model.faces[11 * i + 2];
		faces[k++] = model.faces[11 * i + 3];
	}

	var x, y, min_x, max_x, min_y, max_y;
	min_x = min_y = Number.POSITIVE_INFINITY;
	max_x = max_y = Number.NEGATIVE_INFINITY;

	for(i = 0; i < model.vertices.length / 3; i++) {
		x = model.vertices[3 * i + 0];
		y = model.vertices[3 * i + 1];
		if(x < min_x) min_x = x;
		if(y < min_y) min_y = y;
		if(x > max_x) max_x = x;
		if(y > max_y) max_y = y;
	}

	var uvs = [];
	for(i = 0; i < model.vertices.length / 3; i++) {
		x = model.vertices[3 * i + 0];
		y = model.vertices[3 * i + 1];
		uvs[2 * i + 0] = (x - min_x) / (max_x - min_x);
		uvs[2 * i + 1] = 1 - (y - min_y) / (max_y - min_y);
	}	
	
	ef_logo = new E(gl);
	ef_logo.compile(document.querySelector('#logo_vs').textContent, document.querySelector('#logo_fs').textContent);
	ef_logo.getAttribLocation('position, uv');
	ef_logo.getUniformLocation('projMatrix, viewMatrix, modelMatrix, map');

	ef_logo.d.projMatrix = mat4.identity();
	ef_logo.d.viewMatrix = mat4.identity();
	ef_logo.d.modelMatrix = mat4.identity();

	logo = new B(gl, 'vertices, uvs, faces');

	gl.bindBuffer(gl.ARRAY_BUFFER, logo.b.vertices);
	logo.d.vertices = new Float32Array(model.vertices);
	gl.bufferData(gl.ARRAY_BUFFER, logo.d.vertices, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, logo.b.uvs);
	logo.d.uvs = new Float32Array(uvs);
	gl.bufferData(gl.ARRAY_BUFFER, logo.d.uvs, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, logo.b.faces);
	logo.d.faces = new Int16Array(faces);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, logo.d.faces, gl.STATIC_DRAW);

	var img = document.createElement('img');
	img.src = './data/sia_texture_fit.png';
	img.onload = function(e) {
		sia_map = createTextureFromImage(gl, gl.LINEAR, gl.CLAMP_TO_EDGE, img);
	}; 
};

var tquad_init = function() {
	ef_tquad = new E(gl);
	ef_tquad.compile(document.querySelector('#tquad_vs').textContent, document.querySelector('#tquad_fs').textContent);
	ef_tquad.getAttribLocation('position, uv');
	ef_tquad.getUniformLocation('viewprojMatrix, modelMatrix, alpha, status, color');
	ef_tquad.d.modelMatrix = mat4.identity();

	var vertices = new Float32Array([
		-1, 1,
		1, 1,
		-1, -1, 
		1, -1
	]);

	var uvs = new Float32Array([
		0, 0,
		1, 0,
		0, 1,
		1, 1
	]);
	
	tquad = new B(gl, 'vertices, uvs');
	gl.bindBuffer(gl.ARRAY_BUFFER, tquad.b.vertices);
	tquad.d.vertices = new Float32Array(vertices);
	gl.bufferData(gl.ARRAY_BUFFER, tquad.d.vertices, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, tquad.b.uvs);
	tquad.d.uvs = new Float32Array(uvs);
	gl.bufferData(gl.ARRAY_BUFFER, tquad.d.uvs, gl.STATIC_DRAW);
};

var dust_init = function() {
	ef_dust = new E(gl);
	ef_dust.compile(document.querySelector('#dust_vs').textContent, document.querySelector('#dust_fs').textContent);
	ef_dust.getAttribLocation('position, color');
	ef_dust.getUniformLocation('viewprojMatrix, pointSize, alpha');

	var i;
	for(i = 0; i < dust_limit; i++) {
		dust_vertices[4 * i + 0] = 0;
		dust_vertices[4 * i + 1] = 0;
		dust_vertices[4 * i + 2] = 0;
		dust_vertices[4 * i + 3] = 0;

		to_dust_verts[4 * i + 0] = 0;
		to_dust_verts[4 * i + 1] = 0;
		to_dust_verts[4 * i + 2] = 0;
		to_dust_verts[4 * i + 3] = 1;

		v_dust_verts[4 * i + 0] = 0;
		v_dust_verts[4 * i + 1] = 0;
		v_dust_verts[4 * i + 2] = 0;
		v_dust_verts[4 * i + 3] = 0;

		dust_colors[3 * i + 0] = 0;
		dust_colors[3 * i + 1] = 0;
		dust_colors[3 * i + 2] = 0;

		to_dust_colors[3 * i + 0] = 1;
		to_dust_colors[3 * i + 1] = 1;
		to_dust_colors[3 * i + 2] = 1;
	}

	dust = new B(gl, 'vertices, colors');

	gl.bindBuffer(gl.ARRAY_BUFFER, dust.b.vertices);
	dust.d.vertices = new Float32Array(dust_vertices);
	gl.bufferData(gl.ARRAY_BUFFER, dust.d.vertices, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, dust.b.colors);
	dust.d.colors = new Float32Array(dust_colors);
	gl.bufferData(gl.ARRAY_BUFFER, dust.d.colors, gl.STATIC_DRAW);

	ctx.canvas.style.cssText = 'position: absolute; left: 0px; top: 0px';

	pointSize = 2;
	to_pointSize = 2;
};

var random_hsl_string = function(rH, rS, rL) {
	var h = randomi(rH[0], rH[1]);
	var s = randomi(rS[0], rS[1]);
	var l = randomi(rL[0], rL[1]);
	return 'hsl(' + h + ',' + s + '%,' + l + '%)'; 
};

var reset_dust = function(name, text) {
	if(arranged) {
		arrangeTF();
		arranged = false;
	}

	var colorA = random_hsl_string([0, 360], [100, 100], [50, 60]);
	var colorB = random_hsl_string([0, 360], [100, 100], [50, 80]);

	ctx.canvas.width = 320 * 2;
	ctx.canvas.height = 18 * 8 * 2;
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.font = 'bold 32px 나눔고딕';
	ctx.fillStyle = colorA;
	ctx.fillText(name, 5, 5);

	ctx.font = '28px 나눔고딕';
	ctx.fillStyle = colorB;
	var k = splitText(ctx, text, 600);
	var i, j, x, y, a;
	for(i = 0; i < k.length; i++) {
		ctx.fillText(k[i], 5, 7 + (i + 1) * 18 * 2); // 18
	}

	ctx2.canvas.width = ctx.canvas.width / 2;
	ctx2.canvas.height = ctx.canvas.height / 2;
	ctx2.drawImage(ctx.canvas, 0, 0, ctx2.canvas.width, ctx2.canvas.height);

	j = 0;
	var imgdat = ctx2.getImageData(0, 0, ctx2.canvas.width, ctx2.canvas.height);
	var aratio = imgdat.width / imgdat.height;
	var z = random(-1, 1) * 2;
	for(y = 0; y < imgdat.height; y++) {
		for(x = 0; x < imgdat.width; x++) {
			i = y * imgdat.width + x;
			if(imgdat.data[4 * i + 3] > 0) {
				if(j < dust_limit) {
					to_dust_verts[4 * j + 0] = (x / imgdat.width - 0.5) * 20 * aratio + 0.1;
					to_dust_verts[4 * j + 1] = (0.5 - y / imgdat.height) * 20 - 0.1;
					to_dust_verts[4 * j + 2] = z - 0.5;
					to_dust_verts[4 * j + 3] = random(2, 5);
					a = imgdat.data[4 * i + 3] / 255;
					to_dust_colors[3 * j + 0] = imgdat.data[4 * i + 0] / 255 * 0.25;
					to_dust_colors[3 * j + 1] = imgdat.data[4 * i + 1] / 255 * 0.25;
					to_dust_colors[3 * j + 2] = imgdat.data[4 * i + 2] / 255 * 0.25;
				}
				j++;
			}
		}
	}

	var r, theta;
	var R = random(0.1, 0.9);
	var G = random(0.1, 0.9);
	var B = random(0.1, 0.9);
	for(i = j - 1; i < dust_limit; i++) {
		r = random(10 * (1 - i / dust_limit), 100);
		theta = random(0, Math.PI * 2);
		to_dust_verts[4 * i + 0] = r * Math.cos(theta);
		to_dust_verts[4 * i + 1] = r * Math.sin(theta);
		to_dust_verts[4 * i + 2] = -5 - random(0, 1) * 100;
		to_dust_verts[4 * i + 3] = random(2, 10);

		to_dust_colors[3 * i + 0] = R + random(-0.1, 0.1);
		to_dust_colors[3 * i + 1] = G + random(-0.1, 0.1);
		to_dust_colors[3 * i + 2] = B + random(-0.1, 0.1);
	}

	to_pointSize = 1;
	dust_dt = 0.1;

	//-- tptcl

	ctx.canvas.width = 320 * 2;
	ctx.canvas.height = 18 * 8 * 2;
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.font = 'bold 32px 나눔고딕';
	ctx.fillStyle = colorA;
	ctx.fillText(name, 5, 5);

	ctx.font = '28px 나눔고딕';
	ctx.fillStyle = 'white';
	k = splitText(ctx, text, 600);
	for(i = 0; i < k.length; i++) {
		ctx.fillText(k[i], 5, 7 + (i + 1) * 18 * 2); // 18
	}

	var t = new TPtcl();
	t.map = createTextureFromImage(gl, gl.LINEAR, gl.CLAMP_TO_EDGE, ctx.canvas);
	t.to_pos[0] = 0;
	t.to_pos[1] = 0;
	t.to_pos[2] = z;
	t.scaleFactor = 10;
	t.aratio = ctx.canvas.width / ctx.canvas.height;
	t.status = 0;
	t.color[0] = random(0, 1);
	t.color[1] = random(0.5, 1);
	t.color[2] = random(0.8, 1);
	t.dt = 0.05;
	tptcls.push(t);
	
	if(last_tp) {
		var r = random(50, 100);
		var theta = random(0, Math.PI * 2);
		last_tp.to_pos[0] = 0;
		last_tp.to_pos[1] = 0;
		last_tp.to_pos[2] = random(40, 60);
		last_tp.to_rot[0] = 0;
		last_tp.to_rot[1] = 0;
		last_tp.to_rot[2] = random(-1, 1) * Math.PI * 0.1;
		last_tp.status = 1;
	}

	last_tp = t;
	
	//-- tptcl

	if(tptcls.length > 50) {
		tptcls.shift();
	}
};

var scene_init = function() {
	ctx = document.createElement('canvas').getContext('2d');
	ctx2 = document.createElement('canvas').getContext('2d');

	gl = document.querySelector('#c').getContext('experimental-webgl');
	gl.getExtension("OES_texture_float");
	gl.clearColor(0, 0, 0, 0);
	gl.enable(gl.DEPTH_TEST);
	//gl.enable(gl.CULL_FACE);
	//gl.frontFace(gl.CCW);
	temp_mats = [];
	var i;
	for(i = 0; i < 10; i++) {
		temp_mats[i] = mat4.identity();
	}

	projMatrix = mat4.identity();
	viewMatrix = mat4.identity();
	viewprojMatrix = mat4.identity();

	//-----------
	dust_init();
	tquad_init();

    scene_layout();

    perturb();
};

var tp_compare = function(a, b) {
	return a.pos[2] > b.pos[2] ? 1 : -1;
};

var scene_update = function() {
	var i;

	cam.pos[0] += (cam.to_pos[0] - cam.pos[0]) * 0.1;
	cam.pos[1] += (cam.to_pos[1] - cam.pos[1]) * 0.1;
	cam.pos[2] += (cam.to_pos[2] - cam.pos[2]) * 0.1;

	pointSize += (to_pointSize - pointSize) * 0.02;

	for(i = 0; i < dust.d.vertices.length; i++) {
		v_dust_verts[i] += (to_dust_verts[i] - dust.d.vertices[i]) * dust_dt;
		dust.d.vertices[i] += v_dust_verts[i] * dust_dt;
		v_dust_verts[i] *= 0.925;
	}

	for(i = 0; i < dust.d.colors.length; i++) {
		dust.d.colors[i] += (to_dust_colors[i] - dust.d.colors[i]) * dust_dt * 2;
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, dust.b.vertices);
	gl.bufferData(gl.ARRAY_BUFFER, dust.d.vertices, gl.DYNAMIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, dust.b.colors);
	gl.bufferData(gl.ARRAY_BUFFER, dust.d.colors, gl.DYNAMIC_DRAW);

	dust_alpha += (dust_to_alpha - dust_alpha) * 0.02;
	tp_alpha += (to_tp_alpha - tp_alpha) * 0.1;

	for(i = 0; i < tptcls.length; i++) {
		tptcls[i].update();
	}

	tptcls.sort(tp_compare);

	if(frameCount % 1 == 0) {
		camcnt++;	
	}
	
	if(camcnt > ts.length - 1) {
		camcnt = 0;
	}

	if(frameCount % (60 * 5) == 0) {
		if(auto_pilot) {
			random_select();
		}
	}
};

var scene_draw = function() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	mat4.perspective(60, gl.canvas.width / gl.canvas.height, 0.01, 1000.0, projMatrix);
	mat4.lookAt(cam.pos, cam.target, cam.up, viewMatrix);

	mat4.multiply(projMatrix, viewMatrix, viewprojMatrix);

	gl.enable(gl.DEPTH_TEST);
	
	//--- dust
	gl.useProgram(ef_dust.program);
	gl.bindBuffer(gl.ARRAY_BUFFER, dust.b.vertices);
	gl.enableVertexAttribArray(ef_dust.a.position);
	gl.vertexAttribPointer(ef_dust.a.position, 4, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, dust.b.colors);
	gl.enableVertexAttribArray(ef_dust.a.color);
	gl.vertexAttribPointer(ef_dust.a.color, 3, gl.FLOAT, false, 0, 0);

	gl.uniformMatrix4fv(ef_dust.u.viewprojMatrix, false, viewprojMatrix);
	gl.uniform1f(ef_dust.u.pointSize, pointSize);
	gl.uniform1f(ef_dust.u.alpha, dust_alpha);

	gl.drawArrays(gl.POINTS, 0, dust.d.vertices.length / 4);

	//--- tptcls
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	gl.useProgram(ef_tquad.program);

	gl.bindBuffer(gl.ARRAY_BUFFER, tquad.b.vertices);
	gl.enableVertexAttribArray(ef_tquad.a.position);
	gl.vertexAttribPointer(ef_tquad.a.position, 2, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, tquad.b.uvs);
	gl.enableVertexAttribArray(ef_tquad.a.uv);
	gl.vertexAttribPointer(ef_tquad.a.uv, 2, gl.FLOAT, false, 0, 0);

	gl.uniformMatrix4fv(ef_tquad.u.viewprojMatrix, false, viewprojMatrix);
	for(i = 0; i < tptcls.length; i++) {
		tptcls[i].draw(gl, ef_tquad);
	}	
};

var scene_layout = function() {
	//var tw = document.querySelector('#tw-area').getBoundingClientRect().width;
	gl.canvas.width = window.innerWidth;
	gl.canvas.height = window.innerHeight;

	g.canvas.width = parseInt(window.innerWidth * 0.5);
	g.canvas.height= parseInt(window.innerHeight * 0.5);
	g.canvas.style['width'] = window.innerWidth + 'px';
	g.canvas.style['height'] = window.innerHeight + 'px';
};

var perturb = function() {
	var i, R, r, theta, phi;
	if(random(0, 1) < 0.5) {
		R = random(40, 100);	
	}
	else {
		R = random(5, 10);
	}
	for(i = 0; i < dust.d.vertices.length / 3; i++) {
		r = R * random(0.1, 1);
		theta = random(0, Math.PI);
		phi = random(0, Math.PI * 2);

		to_dust_verts[4 * i + 0] = r * Math.sin(theta) * Math.cos(phi);
		to_dust_verts[4 * i + 1] = r * Math.sin(theta) * Math.sin(phi);
		to_dust_verts[4 * i + 2] = r * Math.cos(theta);

		to_dust_colors[3 * i + 0] += random(-1, 1) * 0.2;
		to_dust_colors[3 * i + 1] += random(-1, 1) * 0.2;
		to_dust_colors[3 * i + 2] += random(-1, 1) * 0.2;
	}

	if(random(0, 1) < 0.5) {
		dust_dt = 0.02;	
	}
	else {
		dust_dt = 0.1;
	}

	if(last_tp) {
		last_tp.dt = 0.1;
		last_tp.to_alpha = 0;
	}
	//document.querySelector('#c').style['-webkit-filter'] = 'blur(2px) sepia(0.9) hue-rotate(' + randomi(0, 360) + 'deg) saturate(3)';

	document.body.style['background-color'] = random_hsl_string([0, 360], [100, 100], [30, 50]);
};

var random_select = function() {
	var feeds = tw_feed[sns_query];
	if(feeds) {
		if(feeds.length > 0) {
			var n = randomi(0, feeds.length - 1);
			takeTweet(feeds[n]);
		}
	}
};

var arranged = false;

var arrangeTS = function() {
	var i, t, x, y, z;
	x = random(-1, 1) * 10;
	y = random(-1, 1) * 10;
	z = random(-1, 1) * 10;
	for(i = 0; i < tptcls.length; i++) {
		t = tptcls[i];
		t.dt = 0.1;
		t.to_scale = 1;
		t.to_rot[0] = random(-1, 1) * Math.PI * 3;
		t.to_rot[1] = random(-1, 1) * Math.PI * 3;
		t.to_rot[2] = random(-1, 1) * Math.PI * 3;
		t.to_pos[0] = x;
		t.to_pos[1] = y;
		t.to_pos[2] = z;
	}

	arranged = true;
};

var arrangeTD = function() {
	// ring
	if(tptcls.length > 0) {
		var i, t, x, y, z, r, theta;
		r = 20;
		theta = Math.PI * 2 / tptcls.length;
		y = random(-1, 1) * 5;
		for(i = 0; i < tptcls.length; i++) {
			t = tptcls[i];
			x = r * Math.sin(theta * i);
			z = r * Math.cos(theta * i);
			t.dt = 0.1;
			t.to_scale = r * Math.PI * 2 / tptcls.length / 40;
			t.to_rot[0] = 0;
			t.to_rot[1] = theta * i;
			t.to_rot[2] = 0;
			t.to_pos[0] = x;
			t.to_pos[1] = y;
			t.to_pos[2] = z;
		}
	}

	arranged = true;
};

var arrangeTF = function() {
	var i, t, x, y, z, r, theta;
	
	r = random(50, 100);
	theta = random(0, Math.PI);

	for(i = 0; i < tptcls.length; i++) {
		t = tptcls[i];

		x = r * Math.cos(theta);
		y = r * Math.sin(theta);
		z = random(100, 200);

		t.dt = 0.1;
		t.to_scale = 1;
		t.to_rot[0] = random(-1, 1) * Math.PI * 3;
		t.to_rot[1] = random(-1, 1) * Math.PI * 3;
		t.to_rot[2] = random(-1, 1) * Math.PI * 3;
		t.to_pos[0] = x;
		t.to_pos[1] = y;
		t.to_pos[2] = z;
	}

	arranged = true;
};

var arrangeTG = function() {
	// spiral
	if(tptcls.length > 0) {
		var i, t, x, y, z, r, theta, dy;
		r = random(10, 15);
		theta = random(0.1, 0.3) * Math.PI;
		dy = random(1, 2) * 1.5;
		y = dy * tptcls.length * 0.5;
		for(i = 0; i < tptcls.length; i++) {
			t = tptcls[i];
			x = r * Math.sin(theta * i);
			z = r * Math.cos(theta * i);
			t.dt = 0.1;
			t.to_scale = r * Math.PI * 2 / (theta * tptcls.length) / 12;
			t.to_rot[0] = 0;
			t.to_rot[1] = theta * i;
			t.to_rot[2] = 0;
			t.to_pos[0] = x;
			t.to_pos[1] = y - dy * i;
			t.to_pos[2] = z;
		}
	}

	arranged = true;
};

var arrangeTH = function() {
	var i, t;
	var h = tptcls.length * 10 * 0.5;
	for(i = 0; i < tptcls.length; i++) {
		t = tptcls[i];
		t.dt = 0.1;
		t.to_scale = 1;
		t.to_rot[0] = 0;
		t.to_rot[1] = 0;
		t.to_rot[2] = 0;
		t.to_pos[0] = 0;
		t.to_pos[1] = 0;
		t.to_pos[2] = h - i * 10;
	}

	arranged = true;
};