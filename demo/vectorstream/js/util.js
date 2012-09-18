var random = function(min, max) {
	return Math.random() * (max - min) + min;
};

var randomi = function(min, max) {
	return Math.round(random(min, max));
};

//---------------------

var B = function(gl, args) {
	this.init(gl, args);
};

B.prototype = {
	init: function(gl, args) {
		this.gl = gl;
		this.b = {};
		this.d = {};

		var i, key;
		var keys = args.split(',');
		for(i = 0; i < keys.length; i++) {
			key = keys[i].trim();
			this.b[key] = gl.createBuffer();
			this.d[key] = null;
		}
	}
};

//---------------------

var E = function(gl) {
	this.init(gl);
};

E.prototype = {
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
			console.log('-- vertex shader');
			console.log(gl.getShaderInfoLog(this.vs));
		}

		gl.shaderSource(this.fs, fs_src);
		gl.compileShader(this.fs);
		if(!gl.getShaderParameter(this.fs, gl.COMPILE_STATUS)) {
			console.log('-- fragment shader');
			console.log(gl.getShaderInfoLog(this.fs));
		}	

		gl.attachShader(this.program, this.vs);
		gl.attachShader(this.program, this.fs);
		gl.linkProgram(this.program);
		if(!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			console.log('-- program');
			console.log(gl.getProgramInfoLog(this.program));
		}
	},
	getAttribLocation: function(args) {
		var i, arg;
		var list = args.split(',');
		for(i = 0; i < list.length; i++) {
			arg = list[i].trim();
			this.a[arg] = this.gl.getAttribLocation(this.program, arg);
		}
	},
	getUniformLocation: function(args) {
		var i, arg;
		var list = args.split(',');
		for(i = 0; i < list.length; i++) {
			arg = list[i].trim();
			this.u[arg] = this.gl.getUniformLocation(this.program, arg);
		}
	}
};

//---------------------

var createTexture = function(gl, width, height, datatype, filter, wrap, data) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, datatype, data);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);

	gl.bindTexture(gl.TEXTURE_2D, null);

	return texture;
};

var createFBO = function(gl, width, height, datatype, filter, wrap, data) {
	var o = {
		fbo: null,
		texture: null,
		data: data
	}
	o.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, o.fbo);
    o.fbo.width = width;
    o.fbo.height = height;

    o.texture = createTexture(gl, width, height, datatype, filter, wrap, data);
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, o.texture, 0);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return o;
};

var deleteFBO = function(gl, o) {
	if(o) {
		if(o.fbo) gl.deleteFramebuffer(o.fbo);
		if(o.texture) gl.deleteTexture(o.texture);
		if(o.data) delete o.data;
	}
};