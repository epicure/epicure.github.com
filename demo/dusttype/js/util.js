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
		this.d = {};
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
			this.d[arg] = null;
		}
	}
};

//---------------------

var createTextureFromImage = function(gl, filter, wrap, img) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

	gl.bindTexture(gl.TEXTURE_2D, null);

	return texture;
};

var createTexture = function(gl, width, height, datatype, filter, wrap, data) {
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, datatype, data);

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

//-----
var tangent = function(p0, p1, dest) {
    //return [(p0[0] - p1[0]) / 2, (p0[1] - p1[1]) / 2, (p0[2] - p1[2]) / 2];
    dest[0] = (p0[0] - p1[0]) / 2;
    dest[1] = (p0[1] - p1[1]) / 2;
    dest[2] = (p0[2] - p1[2]) / 2;
};

var curve = function(p, rez, dest) {
    var px = 0, py = 0, pz = 0, n = 0, num = p.length;
    var t, tt, _1_t, _2t, h00, h10, h01, h11;
    var m0, m1, m2, m3, i;
    m0 = [0, 0, 0];
    m1 = [0, 0, 0];
    m2 = [0, 0, 0];
    m3 = [0, 0, 0];
    i = 0;
    for(n = 0; n < num; n++) {
        for(t = 0; t < 1; t += rez) {
            tt = t * t;
            _1_t = 1 - t;
            _2t = 2 * t;
            h00 =  (1 + _2t) * (_1_t) * (_1_t);
            h10 =  t  * (_1_t) * (_1_t);
            h01 =  tt * (3 - _2t);
            h11 =  tt * (t - 1);

            if(!n) {
                tangent(p[n+1], p[n], m0);
                tangent(p[n+2], p[n], m1);
                px = h00 * p[n][0] + h10 * m0[0] + h01 * p[n+1][0] + h11 * m1[0];
                py = h00 * p[n][1] + h10 * m0[1] + h01 * p[n+1][1] + h11 * m1[1];
                pz = h00 * p[n][2] + h10 * m0[2] + h01 * p[n+1][2] + h11 * m1[2];
            }
            else if(n < num - 2) {
                tangent(p[n+1], p[n-1], m1);
                tangent(p[n+2], p[n], m2);
                px = h00 * p[n][0] + h10 * m1[0] + h01 * p[n+1][0] + h11 * m2[0];
                py = h00 * p[n][1] + h10 * m1[1] + h01 * p[n+1][1] + h11 * m2[1];
                pz = h00 * p[n][2] + h10 * m1[2] + h01 * p[n+1][2] + h11 * m2[2];
            }
            else if(n === num - 1) {
                tangent(p[n], p[n-2], m2);
                tangent(p[n], p[n-1], m3);
                px = h00 * p[n-1][0] + h10 * m2[0] + h01 * p[n][0] + h11 * m3[0];
                py = h00 * p[n-1][1] + h10 * m2[1] + h01 * p[n][1] + h11 * m3[1];
                pz = h00 * p[n-1][2] + h10 * m2[2] + h01 * p[n][2] + h11 * m3[2];
            }
            dest[i] = [px, py, pz];
            i++;
        }
    }
};

//----
var setBit = function(value, position, on) {
	if(on) {
		mask = 1 << position;
        return (value | mask);
	}
    else {
    	mask = ~(1 << position);
        return (value & mask);
    }
};

var getFaceType = function() {
	var hasMaterial = true;
    var hasFaceUvs = false; // not supported in Blender
    var hasFaceVertexUvs = false;

    var hasFaceNormals = false; // don't export any face normals (as they are computed in engine)
    var hasFaceVertexNormals = true;

    var hasFaceColors = false; // not supported in Blender
    var hasFaceVertexColors = false;

    var isTriangle = true;

    var faceType = 0;
    faceType = setBit(faceType, 0, !isTriangle)
    faceType = setBit(faceType, 1, hasMaterial)
    faceType = setBit(faceType, 2, hasFaceUvs)
    faceType = setBit(faceType, 3, hasFaceVertexUvs)
    faceType = setBit(faceType, 4, hasFaceNormals)
    faceType = setBit(faceType, 5, hasFaceVertexNormals)
    faceType = setBit(faceType, 6, hasFaceColors)
    faceType = setBit(faceType, 7, hasFaceVertexColors)

    /*
    # order is important, must match order in JSONLoader

    # face type
    # vertex indices
    # material index
    # face uvs index
    # face vertex uvs indices
    # face color index
    # face vertex colors indices
	*/

    return faceType;
};