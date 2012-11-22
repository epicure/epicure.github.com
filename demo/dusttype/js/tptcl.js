var TPtcl = function() {
	this.init();
};

TPtcl.prototype = {
	init: function() {
		this.map = null;
		this.aratio = 1;

		this.pos = vec3.create();
		this.rot = vec3.create();
		this.scale = 1;

		this.to_pos = vec3.create();
		this.to_rot = vec3.create();
		this.to_scale = 1;
		
		this.scaleFactor = 1;
		this.rscale = vec3.create();

		this.alpha = 0;
		this.to_alpha = 1;
		this.dt = 0.01;

		this.status = 0;
		this.color = vec3.create();
	},
	update: function() {
		this.pos[0] += (this.to_pos[0] - this.pos[0]) * 0.05;
		this.pos[1] += (this.to_pos[1] - this.pos[1]) * 0.05;
		this.pos[2] += (this.to_pos[2] - this.pos[2]) * 0.05;
	
		this.rot[0] += (this.to_rot[0] - this.rot[0]) * 0.05;
		this.rot[1] += (this.to_rot[1] - this.rot[1]) * 0.05;
		this.rot[2] += (this.to_rot[2] - this.rot[2]) * 0.05;

		this.scale += (this.to_scale - this.scale) * 0.05;
		this.rscale[0] = this.aratio * this.scaleFactor * this.scale;
		this.rscale[1] = this.scaleFactor * this.scale;
		this.rscale[2] = 0;

		this.alpha += (this.to_alpha - this.alpha) * this.dt; 
	},
	draw: function(gl, ef) {
		mat4.identity(ef.d.modelMatrix);
		mat4.translate(ef.d.modelMatrix, this.pos);
		mat4.rotateX(ef.d.modelMatrix, this.rot[0]);
		mat4.rotateY(ef.d.modelMatrix, this.rot[1]);
		mat4.rotateZ(ef.d.modelMatrix, this.rot[2]);
		mat4.scale(ef.d.modelMatrix, this.rscale);

		gl.uniformMatrix4fv(ef.u.modelMatrix, false, ef.d.modelMatrix);
		gl.uniform1f(ef.u.alpha, this.alpha * tp_alpha);
		gl.uniform1i(ef.u.status, this.status);
		gl.uniform3fv(ef.u.color, this.color);

		gl.activeTexture(gl.TEXTURE0);
    	gl.bindTexture(gl.TEXTURE_2D, this.map);
    	gl.uniform1i(ef.u.map, 0);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}
};