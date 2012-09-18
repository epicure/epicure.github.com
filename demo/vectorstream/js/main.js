var gl;
var ptcl, ef_ptcl;
var quad, ef_phys, ef_flow;
var fbo_pos, fbo_vel, fbo_acc;

var m_proj, m_view, m_viewproj, m_model, eye, to_eye;
var pf = [];
var vf = [];
var to_vf = [];
var size;
var frameCount = 0;
var params, gui;

var layout = function() {
	gl.canvas.width = window.innerWidth;
	gl.canvas.height = window.innerHeight;
};

var arrow = {
	init: function(gl, vs, fs) {
		this.cone = new B(gl, 'vertices');
		this.cap = new B(gl, 'vertices');
		this.line = new B(gl, 'vertices');
		this.cube = new B(gl, 'vertices, indices');
		this.ef = new E(gl);
		this.ef.compile(vs, fs);
		this.ef.getAttribLocation('position');
		this.ef.getUniformLocation('viewprojMatrix, modelMatrix');
		this.axis = vec3.create();
		this.angle = 0;
		this.forward = vec3.createFrom(0, 0, 1);
		this.backward = vec3.createFrom(0, 0, 1);
		this.dir = vec3.create();

		gl.bindBuffer(gl.ARRAY_BUFFER, this.line.b.vertices);
		this.line.d.vertices = new Float32Array([
			0, 0, 0,
			0, 0, 0
		]);
		gl.bufferData(gl.ARRAY_BUFFER, this.line.d.vertices, gl.DYNAMIC_DRAW);
		
		var cv = [];
		cv.push(0, 0, 2);
		var i, x, z, theta, n;
		n = 16;
		theta = Math.PI * 2 / n;
		for(i = 0; i < n + 1; i++) {
			x = 0.5 * Math.cos(theta * i);
			y = 0.5 * Math.sin(theta * i);
			cv.push(x, y, 0);
		}
		this.cone.d.vertices = new Float32Array(cv);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.cone.b.vertices);
		gl.bufferData(gl.ARRAY_BUFFER, this.cone.d.vertices, gl.STATIC_DRAW);
		cv = [];
		cv.push(0, 0, 0);
		for(i = 0; i < n + 1; i++) {
			x = 0.5 * Math.cos(-theta * i);
			y = 0.5 * Math.sin(-theta * i);
			cv.push(x, y, 0);
		}	
		this.cap.d.vertices = new Float32Array(cv);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.cap.b.vertices);
		gl.bufferData(gl.ARRAY_BUFFER, this.cap.d.vertices, gl.STATIC_DRAW);

		this.cube.d.vertices = new Float32Array([
			-1, 1, 1,
			1, 1, 1,
			-1, -1, 1,
			1, -1, 1,
			-1, 1, -1,
			1, 1, -1,
			-1, -1, -1,
			1, -1, -1
		]);

		this.cube.d.indices = new Int16Array([
			0, 2, 3, 0, 3, 1,
			1, 3, 7, 1, 7, 5,
			4, 7, 6, 4, 5, 7,
			4, 6, 2, 4, 2, 0,
			4, 0, 1, 4, 1, 5,
			2, 6, 7, 2, 7, 3
		]);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.cube.b.vertices);
		gl.bufferData(gl.ARRAY_BUFFER, this.cube.d.vertices, gl.STATIC_DRAW);		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cube.b.indices);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.cube.d.indices, gl.STATIC_DRAW);
	},
	draw: function(gl, viewprojMatrix, modelMatrix, dir) {
		gl.useProgram(this.ef.program);
		
		gl.enableVertexAttribArray(this.ef.a.position);

		mat4.identity(modelMatrix);
		gl.uniformMatrix4fv(this.ef.u.viewprojMatrix, false, viewprojMatrix);
		gl.uniformMatrix4fv(this.ef.u.modelMatrix, false, modelMatrix);

		// line
		gl.bindBuffer(gl.ARRAY_BUFFER, this.line.b.vertices);
		gl.bufferData(gl.ARRAY_BUFFER, this.line.d.vertices, gl.DYNAMIC_DRAW);
		gl.vertexAttribPointer(this.ef.a.position, 3, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.LINES, 0, this.line.d.vertices.length / 3);

		// cube
		mat4.identity(modelMatrix);
		mat4.translate(modelMatrix, [this.line.d.vertices[0], this.line.d.vertices[1], this.line.d.vertices[2]]);
		mat4.scale(modelMatrix, [0.2, 0.2, 0.2]);
		gl.uniformMatrix4fv(this.ef.u.modelMatrix, false, modelMatrix);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.cube.b.vertices);
		gl.vertexAttribPointer(this.ef.a.position, 3, gl.FLOAT, false, 0, 0);
		gl.drawElements(gl.TRIANGLES, this.cube.d.indices.length, gl.UNSIGNED_SHORT, 0);

		// cone
		vec3.normalize(dir, this.dir);
		this.angle = Math.acos(vec3.dot(this.forward, this.dir));
		if(this.angle < 0) {
			vec3.cross(this.dir, this.backward, this.axis);
		}
		else {
			vec3.cross(this.dir, this.forward, this.axis);	
		}

		mat4.identity(modelMatrix);
		mat4.translate(modelMatrix, [this.line.d.vertices[3], this.line.d.vertices[4], this.line.d.vertices[5]]);
		mat4.rotate(modelMatrix, -this.angle, this.axis);
		gl.uniformMatrix4fv(this.ef.u.modelMatrix, false, modelMatrix);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.cone.b.vertices);
		gl.vertexAttribPointer(this.ef.a.position, 3, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, this.cone.d.vertices.length / 3);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.cap.b.vertices);
		gl.vertexAttribPointer(this.ef.a.position, 3, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, this.cap.d.vertices.length / 3);	
	}
};

var resetSystem = function(gl, _size) {
	size = _size;

	var i, x, y, z;
	var vertices = [];
	var n = size * size;
	for(y = 0; y < size; y++) {
		for(x = 0; x < size; x++) {
			i = y * size + x;
			vertices[3 * i + 0] = x / (size - 1);
			vertices[3 * i + 1] = y / (size - 1);
			vertices[3 * i + 2] = random(0.5, 1.0);
		}
	}

	var pixels = [];
	for(i = 0; i < n; i++) {
		pixels.push(random(-1, 1) * 100, random(-1, 1) * 100, random(-1, 1) * 100, random(0.9, 1.0));
	}

	ptcl.d.vertices = new Float32Array(vertices);

	gl.bindBuffer(gl.ARRAY_BUFFER, ptcl.b.vertices);
	gl.bufferData(gl.ARRAY_BUFFER, ptcl.d.vertices, gl.DYNAMIC_DRAW);

	deleteFBO(gl, fbo_pos);
	deleteFBO(gl, fbo_vel);
	deleteFBO(gl, fbo_acc);

	fbo_pos = createFBO(gl, size, size, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(pixels));
	fbo_vel = createFBO(gl, size, size, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, null);
	fbo_acc = createFBO(gl, size, size, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array(pixels));

	gl.useProgram(ef_ptcl.program);
	gl.uniform2fv(ef_ptcl.u.resolution, [size, size]);

	gl.useProgram(ef_phys.program);
	gl.uniform2fv(ef_phys.u.resolution, [size, size]);
};

var init = function() {
	m_proj = mat4.identity();
	m_view = mat4.identity();
	m_model = mat4.identity();
	m_viewproj = mat4.identity();

	eye = [0, 0, 10];
	to_eye = [0, 0, 10];

	gl = document.querySelector('#c').getContext('experimental-webgl');
	gl.getExtension("OES_texture_float");
	gl.clearColor(0, 0, 0, 1);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);

	ef_flow = new E(gl);
	ef_flow.compile(document.querySelector('#flow_vs').textContent, document.querySelector('#flow_fs').textContent);
	ef_flow.getAttribLocation('position, texCoord');
	ef_flow.getUniformLocation('map');
	gl.useProgram(ef_flow.program);

	ef_ptcl = new E(gl);
	ef_ptcl.compile(document.querySelector('#ptcl_vs').textContent, document.querySelector('#ptcl_fs').textContent);
	ef_ptcl.getAttribLocation('position');
	ef_ptcl.getUniformLocation('viewprojMatrix, pmap, ar, resolution, pointSize, color, opacity');

	ef_phys = new E(gl);
	ef_phys.compile(document.querySelector('#flat_vs').textContent, document.querySelector('#phys_fs').textContent);
	ef_phys.getAttribLocation('position');
	ef_phys.getUniformLocation('pmap, vmap, amap, resolution, pf, vf, pass, bound_mode, from_mode');

	quad = new B(gl, 'vertices, texCoords');
	gl.bindBuffer(gl.ARRAY_BUFFER, quad.b.vertices);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		1, 1,
		-1, 1,
		1, -1,
		-1, -1
	]), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, quad.b.texCoords);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		1, 1,
		0, 1,
		1, 0,
		0, 0
	]), gl.STATIC_DRAW);

	ptcl = new B(gl, 'vertices');
	resetSystem(gl, 512);

	random_vf();
	for(i = 0; i < to_vf.length; i++) { 
		vf[i] = to_vf[i];
	}

	gl.uniform4fv(ef_phys.u.pf, pf);
    gl.uniform3fv(ef_phys.u.vf, vf);

    arrow.init(gl, document.querySelector('#basic_vs').textContent, document.querySelector('#basic_fs').textContent);

    layout();
};

var random_vf = function() {
	var s = 50;
	var i = 0;
	for(z = -1; z <= 1; z++) {
		for(y = -1; y <= 1; y++) {
			for(x = -1; x <= 1; x++) {
				pf[4 * i + 0] = s * x;
				pf[4 * i + 1] = s * y;
				pf[4 * i + 2] = s * z;
				pf[4 * i + 3] = s;
				to_vf[3 * i + 0] = random(-1, 1) * random(5, 25);
				to_vf[3 * i + 1] = random(-1, 1) * random(5, 25);
				to_vf[3 * i + 2] = random(-1, 1) * random(5, 25);
				i++;
			}	
		}
	}
};

var update = function() {
	var i;

	eye[0] += (to_eye[0] - eye[0]) * 0.1;
	eye[1] += (to_eye[1] - eye[1]) * 0.1;
	eye[2] += (to_eye[2] - eye[2]) * 0.1;

	for(i = 0; i < to_vf.length; i++) {
		vf[i] += (to_vf[i] - vf[i]) * 0.1;
	}
};

var draw = function() {
	gl.clearColor(gui.__controllers[1].__color.__state.r / 255, gui.__controllers[1].__color.__state.g / 255, gui.__controllers[1].__color.__state.b / 255, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.viewport(0, 0, size, size);
	gl.disable(gl.BLEND);
	gl.useProgram(ef_phys.program);
	gl.uniform1i(ef_phys.u.bound_mode, params['bound']);

	gl.bindBuffer(gl.ARRAY_BUFFER, quad.b.vertices);
	gl.enableVertexAttribArray(ef_phys.a.position);
	gl.vertexAttribPointer(ef_phys.a.position, 2, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, fbo_acc.texture);
    gl.uniform1i(ef_phys.u.amap, 0);
    gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, fbo_vel.texture);
    gl.uniform1i(ef_phys.u.vmap, 1);
    gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, fbo_pos.texture);
    gl.uniform1i(ef_phys.u.pmap, 2);

    
    if(params['auto perturb'] && frameCount % 300 == 0) {
    	random_vf();
    }

    gl.uniform3fv(ef_phys.u.vf, vf);

    //---------- acc
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo_acc.fbo);
	gl.uniform1i(ef_phys.u.pass, 0);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	//---------- vel
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo_vel.fbo);
	gl.uniform1i(ef_phys.u.pass, 1);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	//---------- pos
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo_pos.fbo);
	gl.uniform1i(ef_phys.u.pass, 2);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	//----------

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	mat4.perspective(60, gl.canvas.width / gl.canvas.height, 0.01, 1000.0, m_proj);

	mat4.lookAt(eye, [0, 0, 0], [0, 1, 0], m_view);

	gl.useProgram(ef_ptcl.program);
	gl.uniform1f(ef_ptcl.u.pointSize, parseFloat(params['point size']) - 1);
	gl.uniform1f(ef_ptcl.u.opacity, params['opacity']);
	gl.uniform3f(ef_ptcl.u.color, gui.__controllers[0].__color.__state.r / 255, gui.__controllers[0].__color.__state.g / 255, gui.__controllers[0].__color.__state.b / 255);

	gl.bindBuffer(gl.ARRAY_BUFFER, ptcl.b.vertices);
	gl.enableVertexAttribArray(ef_ptcl.a.position);
	gl.vertexAttribPointer(ef_ptcl.a.position, 3, gl.FLOAT, false, 0, 0);

	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

	mat4.multiply(m_proj, m_view, m_viewproj);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, fbo_pos.texture);
    gl.uniform1i(ef_ptcl.u.pmap, 0);

	gl.uniformMatrix4fv(ef_ptcl.u.viewprojMatrix, false, m_viewproj);
	gl.drawArrays(gl.POINTS, 0, ptcl.d.vertices.length / 3);

	if(params['show vectors']) {
		var mat = mat4.identity();
		var axis = vec3.create();
		for(i = 0; i < 27; i++) {
			arrow.line.d.vertices[0] = pf[4 * i + 0];
			arrow.line.d.vertices[1] = pf[4 * i + 1];
			arrow.line.d.vertices[2] = pf[4 * i + 2];
			arrow.line.d.vertices[3] = pf[4 * i + 0] + vf[3 * i + 0];
			arrow.line.d.vertices[4] = pf[4 * i + 1] + vf[3 * i + 1];
			arrow.line.d.vertices[5] = pf[4 * i + 2] + vf[3 * i + 2];

			arrow.draw(gl, m_viewproj, mat, [vf[3 * i + 0], vf[3 * i + 1], vf[3 * i + 2]]);
		}	
	}
	
	if(params['show GPGPU']) {
		gl.disable(gl.BLEND);
		gl.useProgram(ef_flow.program);
		gl.bindBuffer(gl.ARRAY_BUFFER, quad.b.vertices);
		gl.enableVertexAttribArray(ef_flow.a.position);
		gl.vertexAttribPointer(ef_flow.a.position, 2, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, quad.b.texCoords);
		gl.enableVertexAttribArray(ef_flow.a.texCoord);
		gl.vertexAttribPointer(ef_flow.a.texCoord, 2, gl.FLOAT, false, 0, 0);

		var px = 5;
		var psize = 128;
		gl.viewport(px, 0, psize, psize);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, fbo_pos.texture);
	    gl.uniform1i(ef_flow.u.map, 0);
	    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	    px += psize + 5;
	    gl.viewport(px, 0, psize, psize);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, fbo_vel.texture);
	    gl.uniform1i(ef_flow.u.map, 0);
	    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	frameCount++;
};

var loop = function() {
	update();
	draw();
	webkitRequestAnimationFrame(loop);
};

var Params = function() {
	this['ptcl color'] = [ 0, 255, 128 ];
	this['bg color'] = [ 0, 0, 0 ];
	this['opacity'] = 1;
	this['point size'] = 2;
	this['show vectors'] = false;
	this['show GPGPU'] = false;
	this['perturb'] = function() { 
		random_vf();
	};
	this['auto perturb'] = false;
	this['bound'] = 0;
	this['reset size'] = 512;
	this['filter'] = 'blur(0px)';
};

window.onload = function(e) {
	params = new Params();
	gui = new dat.GUI();
	gui.addColor(params, 'ptcl color');
	gui.addColor(params, 'bg color');
	gui.add(params, 'opacity', 0, 1);
	gui.add(params, 'point size', 1, 10);
	gui.add(params, 'show vectors');
	var gpgpu = gui.add(params, 'show GPGPU');
	gui.add(params, 'perturb');
	gui.add(params, 'auto perturb');
	gui.add(params, 'bound', { cube: 0, sphere_surface: 1, sphere_center: 2} );
	var reset = gui.add(params, 'reset size', { '1x1': 1, '2x2': 2, '4x4': 4, '8x8': 8, '16x16': 16, '32x32': 32, '64x64': 64, '128x128': 128, '256x256': 256, '512x512': 512, '1024x1024': 1024, '2048x2048': 2048} );
	var filter = gui.add(params, 'filter');	

	init();
	loop();

	filter.onChange(function(value) {
		gl.canvas.style['-webkit-filter'] = value;
	});

	reset.onChange(function(value) {
		resetSystem(gl, parseInt(value));
	});

	gpgpu.onChange(function(value) {
		if(value) {
			document.querySelector('#label_pos').style['visibility'] = 'visible';
			document.querySelector('#label_vel').style['visibility'] = 'visible';
		}
		else {
			document.querySelector('#label_pos').style['visibility'] = 'hidden';
			document.querySelector('#label_vel').style['visibility'] = 'hidden';
		}
	});
};

window.onresize = function(e) {
	layout();
};

window.onmousemove = function(e) {
	to_eye[0] = (0.5 - e.clientX / window.innerWidth) * 200;
	to_eye[1] = (e.clientY / window.innerHeight - 0.5) * 200;
	to_eye[2] = 5 + Math.sqrt(eye[0] * eye[0] + eye[1] * eye[1]);
};