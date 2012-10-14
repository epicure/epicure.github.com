var Bandi = function(gl) {
	this.init(gl);
};

Bandi.prototype = {
	init: function(gl) {
		this.gl = gl;
		this.pos = [0, 0];

		this.phase1 = random(0, Math.PI);
		this.phase2 = random(0, Math.PI);
		this.speed1 = random(0.1, 0.2);
		this.speed2 = random(0.1, 0.2);
		
		this.frameCount = 0;
		this.tendrils = null;
		this.bTendril = null;

		this.tp = [0, 0, 0];
		this.tp2 = [0, 0, 0];

		this.ax = random(-1, 1) * 100;
		this.ay = random(-1, 1) * 100;
		this.to_ax = random(-1, 1) * 100;
		this.to_ay = random(-1, 1) * 100;
		this.vx = 0;
		this.vy = 0;
		this.vd = 0;
		this.maxv = 50;
		this.decay = 0.95;

		this.energy = randomi(100, 200);
		this.period = randomi(30, 120);
		this.fluct = 200;
		this.flx = 0;
		this.fly = 0;
		this.fle = 0;
		
		this.opacity = 1;
		this.to_opacity = 1;
		this.dt = 0.1;

		this.free = true;
	},
	update: function() {
		if(this.bTendril) {
			var p = this.bTendril.getV((Math.sin(this.frameCount * this.speed1 * 0.01 + this.phase1) + 1) * 0.5);
			this.tp[0] = p[0];
			this.tp[1] = p[1];
			this.fle = this.fluct / 200;
			mat4.multiplyVec3(this.bTendril.transform, this.tp, this.tp2);
			this.vx += (this.tp2[0] - this.pos[0] + this.flx * this.fle) * 0.1;
			this.vy += (this.tp2[1] - this.pos[1] + this.fly * this.fle) * 0.1;

			if(this.fluct > 0) {
				if(this.fluct % 10 == 0) {
					this.flx = random(-500, 500) * (1 - this.fle);
					this.fly = random(-500, 500) * (1 - this.fle);
				}
				this.fluct--;
			}

			if(this.vd < 5) {
				if(random(0, 1) < 0.01) {
					this.dt = 0.002;
					this.to_opacity = 0;
				}
			}
		}
		else {
			if(this.free) {
				this.ax += (this.to_ax - this.ax) * 0.01;
				this.ay += (this.to_ay - this.ay) * 0.01;
				this.vx += this.ax * 0.1;
				this.vy += this.ay * 0.1;

				if(this.frameCount % this.period == 0) {
					this.to_ax = random(-1, 1) * 100;
					this.to_ay = random(-1, 1) * 100;
				}	
			}
			else {
				this.ax += (this.tp[0] - this.pos[0]) * 0.1;
				this.ay += (this.tp[1] - this.pos[1]) * 0.1;
				this.vx += this.ax * 0.1;
				this.vy += this.ay * 0.1;
				this.ax *= 0.75;
				this.ay *= 0.75;

				if(random(0, 1) < 0.01) {
					this.ax = random(-1, 1) * 50;
					this.ay = random(-1, 1) * 50;
				}
			}
		}

		this.vd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
		if(this.vd > this.maxv) {
			this.vx = this.vx / this.vd * this.maxv;
			this.vy = this.vy / this.vd * this.maxv;
		}
		this.opacity += (this.to_opacity - this.opacity) * this.dt;
		this.pos[0] += this.vx * 0.1;
		this.pos[1] += this.vy * 0.1;
		this.vx *= this.decay;
		this.vy *= this.decay;

		if(this.energy > 0) {
			this.energy--;
			if(this.energy == 0) {
				this.bindToRandomTendril();
				this.fluct = 200;
				if(!this.free) {
					this.impact();
					this.free = true;
				}
			}
		}

    	this.frameCount++;
	},
	draw: function(gl, effect) {
		gl.uniform2f(effect.u.pos, this.pos[0], this.pos[1]);
		gl.uniform1f(effect.u.opacity, this.opacity);

		gl.uniform4f(effect.u.fpsr, this.frameCount, this.phase1, this.speed1, 5);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    	gl.uniform4f(effect.u.fpsr, this.frameCount, this.phase2, this.speed2, 20);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	},
	bindToRandomTendril: function() {
		var n = randomi(0, this.tendrils.length - 1);
		this.bTendril = this.tendrils[n];
		this.bTendril.bandiList.push(this);
	},
	impact: function() {
		this.bTendril = null;
		this.energy = randomi(200, 300);
		this.dt = 0.1;
		this.to_opacity = 1;
		if(random(0, 1) < 0.1) {
			this.energy = randomi(500, 1000);	
		}
		this.period = randomi(30, 120);
	}
};