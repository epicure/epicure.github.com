var Tendril = function() {
	this.init();
};

Tendril.prototype = {
	init: function() {
		this.phase = random(0, Math.PI);
		this.speed = random(0.001, 0.002);

	    this.hsb = [
	    	0, 0, 0
	    ];
	    this.to_hsb = [
	    	0, 0, 1
	    ];

	    this.theta = 0;
	    this.d_length = 0;

	    this.amplitude = Math.PI * 0.01;
	    this.to_amplitude = this.amplitude;
	    this.v_amplitude = 0;

	    this.vecs = [];
	    this.vList = [];
	    this.vertexData = [];

	    this.vb = null;
	    this.pos = [0, 0, 0];
	    this.rot = 0;
	    this.transform = mat4.identity();

	    this.frameCount = 0;
	    this.bandiList = [];
	},
	proceed: function(t_scale) {
		var d = this.d_length * t_scale;
		var dx = Math.cos(this.theta);
		var dy = Math.sin(this.theta);
        
        this.vecs.push([dx * d, dy * d]);
	},
	make: function(t_length, t_height, t_width, rf) {
        this.d_length = 0.1;
        this.theta = -Math.PI * 0.5 + random(-1, 1) * Math.PI * 0.1;
        var d_theta = 0;
        
        var d = 0;
        var curl, curl_weight;
        var curl_1 = random(-1, 1);
        var curl_2 = random(0, 1) * 10;
        var curl_start = 0.1 + random(0.0, 0.3);

        var to_curl_1 = random(-1, 1);
        var to_curl_2 = random(-1, 1);
        var to_curl_start = 0.1 + random(0.0, 0.3);

        var seg = 0.1;
        var to_seg = 0.01;
        var k, k2, r_factor;

        while (d < t_length) {
            k = d / t_length;
            k2 = k * k;
            r_factor = 1 - Math.pow(k, rf);
            this.proceed(t_height * r_factor);

            curl_1 = (1 - k) * to_curl_1 + k * curl_1;
            curl_2 = (1 - k) * to_curl_2 + k * curl_2;
            curl_start = (1 - k) * to_curl_start + k * curl_start;
           
            if (k < curl_start) {
                curl = curl_1;
                curl_weight = 0.01;
            }
            else {
                curl = curl_2;
                curl_weight = 0.03;
            }

            d_theta += curl * Math.PI * 0.25 * curl_weight;
            this.theta += d_theta;

            d_length = (1 - k2) * seg + k2 * to_seg;

            d += d_length;
        }

        var i, k, rr, vx, vy, theta, rc, rs;
        var x = 0;
        var y = 0;

		for(i = 0; i < this.vecs.length; i++) {
			k = 1 - i / (this.vecs.length - 1);
			rr = t_width * Math.pow(Math.sin(k * Math.PI * 0.5), 2);

			vx = this.vecs[i][0];
			vy = this.vecs[i][1];

			theta = Math.atan2(vy, vx) + Math.PI * 0.5;

			rc = rr * Math.cos(theta);
			rs = rr * Math.sin(theta);

			x1 = x + rc;
			y1 = y + rs;
			x2 = x - rc;
			y2 = y - rs;
			this.vertexData.push( x + rc );
			this.vertexData.push( y + rs );
			this.vertexData.push( x - rc );
			this.vertexData.push( y - rs );

			this.vList.push([x, y]);

			x += vx * 10;
			y += vy * 10;
		}
    },
    bake: function(gl) {
    	this.vb = gl.createBuffer();
    	gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexData), gl.STATIC_DRAW);
    },
    impact: function(x) {
    	var dx = Math.abs(this.pos[0] - x);
		if(dx < 50) {
			this.to_amplitude = random(1, 2) * Math.PI * 0.05;
			this.to_hsb[0] = (Math.sin(this.frameCount * 0.01) + 1) * 0.5;
			if(random(0, 1) < 0.5) this.to_hsb[1] = random(0.9, 1);
			if(random(0, 1) < 0.5) this.to_hsb[2] = random(0.6, 1);

			var i;
			while(this.bandiList.length > 0) {
				var b = this.bandiList.shift();
				b.impact();
			}
		}
    },
    getV: function(k) {
    	return this.vList[Math.floor(k * (this.vList.length - 1))];
    },
    update: function() {
    	this.v_amplitude += (this.to_amplitude - this.amplitude) * 0.1;
        this.amplitude += this.v_amplitude * 0.1;
        this.v_amplitude *= 0.95;

    	this.rot = Math.sin(this.frameCount * 0.01) * this.amplitude;

    	this.hsb[0] += (this.to_hsb[0] - this.hsb[0]) * 0.01;
        this.hsb[1] += (this.to_hsb[1] - this.hsb[1]) * 0.02;
        this.hsb[2] += (this.to_hsb[2] - this.hsb[2]) * 0.03;

    	mat4.identity(this.transform);
    	mat4.translate(this.transform, this.pos);
		mat4.rotateZ(this.transform, this.rot);

		if (this.to_amplitude > Math.PI * 0.01) {
            this.to_amplitude *= 0.9;
        }
		this.frameCount++;
    },
    draw: function(gl, effect) {	
		gl.uniformMatrix4fv(effect.u.model, false, this.transform);
		gl.uniform3fv(effect.u.hsb, this.hsb);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
		gl.vertexAttribPointer(effect.a.position, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.vertexData.length / 2);
    }
};