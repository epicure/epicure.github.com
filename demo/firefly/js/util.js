var random = function(min, max) {
	return Math.random() * (max - min) + min;
};

var randomi = function(min, max) {
	return Math.round(random(min, max));
};

var createShader = function(gl, type, src) {
	var s = gl.createShader(type);
	gl.shaderSource(s, src);
	gl.compileShader(s);
	if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
		console.log(gl.getShaderInfoLog(s));
	}

	return s;
};

var createProgram = function(gl, vs, fs) {
	var program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.log(gl.getProgramInfoLog(program));
	}
	return program;
};

var createTexture = function(gl, img) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

	return texture;
};

var Effect = function(gl) {
	this.init(gl);
};

Effect.prototype = {
	init: function(gl) {
		this.gl = gl;
		this.a = {};
		this.u = {};
		this.vs = gl.createShader(gl.VERTEX_SHADER);
		this.fs = gl.createShader(gl.FRAGMENT_SHADER);
		this.program = gl.createProgram();
	},
	compile: function(vs_src, fs_src) {
		var gl = this.gl;
		gl.shaderSource(this.vs, vs_src);
		gl.compileShader(this.vs);
		if(!gl.getShaderParameter(this.vs, gl.COMPILE_STATUS)) {
			console.log(gl.getShaderInfoLog(this.vs));
		}

		gl.shaderSource(this.fs, fs_src);
		gl.compileShader(this.fs);
		if(!gl.getShaderParameter(this.fs, gl.COMPILE_STATUS)) {
			console.log(gl.getShaderInfoLog(this.fs));
		}	

		gl.attachShader(this.program, this.vs);
		gl.attachShader(this.program, this.fs);
		gl.linkProgram(this.program);
		if(!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			console.log(gl.getProgramInfoLog(this.program));
		}
	},
	getAttribLocation: function() {
		var i;
		for(i = 0; i < arguments.length; i++) {
			this.a[arguments[i]] = this.gl.getAttribLocation(this.program, arguments[i]);
		}
	},
	getUniformLocation: function() {
		var i;
		for(i = 0; i < arguments.length; i++) {
			this.u[arguments[i]] = this.gl.getUniformLocation(this.program, arguments[i]);
		}
	}
};