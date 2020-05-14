const ctrl = {
  r_d: 50,
  prob: 0.1,
  opacity: 0.1,
  to_opacity: 0.1,
};

class Ptcl {
  constructor() {
    this.x = Math.random() * innerWidth;
    this.y = Math.random() * innerHeight;
    this.px = this.x;
    this.py = this.y;
    
    this.to_ax = (Math.random()*2 - 1);
    this.to_ay = (Math.random()*2 - 1);
    [this.to_ax, this.to_ay] = this.normalize(this.to_ax, this.to_ay);
    
    this.ax = 0.0;
    this.ay = 0.0;
    
    this.vx = (Math.random()*2 - 1);
    this.vy = (Math.random()*2 - 1);
    [this.vx, this.vy] = this.normalize(this.vx, this.vy);
    
    this.speed = (0.7 + 0.3 * Math.random());
    
    this.r = 5;
    this.reff = 10;
    
    this.tail = [];
    this.frame_count = 0;
    
    this.to_hue = Math.random();
    this.hue = Math.random();
    this.hue_origin = this.hue;
    this.sat = 50 + Math.random()*50 | 0;
    this.lig = 25 + Math.random()*25 | 0;
    
    this.flock = 0;
  }
  
  normalize(vx, vy) {
    const d = Math.sqrt(vx*vx + vy*vy) + 1e-6;
    return [vx/d, vy/d];
  }
  
  update(ptcls, timestamp) {
    this.px = this.x;
    this.py = this.y;
    const rd = ctrl.r_d;
    for(let i = 0; i < ptcls.length; i++) {
      const other = ptcls[i];
      if(this !== other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const d = Math.sqrt(dx*dx + dy*dy) + 1e-6;
        const ux = dx / d;
        const uy = dy / d;
        const R = this.reff + other.reff;
        if(d < rd && Math.random() < ctrl.prob) {
          const k = -(1.0/rd)*d+1.0;
          //const k = (-(1.0/rd)*d+1.0) * Math.pow(1.8, -0.2*d);
          this.to_ax += (other.to_ax - this.to_ax) * k;
          this.to_ay += (other.to_ay - this.to_ay) * k;
          this.ax += (other.ax - this.ax) * k;
          this.ay += (other.ay - this.ay) * k;
          
          this.flock += 1;
          
          if(this.flock > 10) {
            this.to_hue += (other.to_hue - this.to_hue) * k;  
          }
        }
        if(d < R) {
          const dR = (R - d) * 0.5;
          this.x += ux * dR * 0.1;
          this.y += uy * dR * 0.1;
          other.x -= ux * dR * 0.1;
          other.y -= uy * dR * 0.1;
          
          this.ax += ux * dR * 0.01;
          this.ay += uy * dR * 0.01;
        }
      }
    }
    this.ax += (this.to_ax - this.ax) * 0.05;
    this.ay += (this.to_ay - this.ay) * 0.05;
    [this.ax, this.ay] = this.normalize(this.ax, this.ay);

    this.vx += this.ax;
    this.vy += this.ay;
    //[this.vx, this.vy] = this.normalize(this.vx, this.vy);
    
    this.x += this.vx * this.speed * 0.2;
    this.y += this.vy * this.speed * 0.2;
    
    this.vx *= 0.9;
    this.vy *= 0.9;
    
    this.hue += (this.to_hue - this.hue) * 0.02;
    
    if(this.x < 0 - this.r) { 
      this.x = innerWidth + this.r;
      //this.x = this.r;
      //this.vx *= -1;
    }
    if(this.y < 0 - this.r) { 
      this.y = innerHeight + this.r;
      //this.y = this.r;
      //this.vy *= -1;
    }
    if(this.x > innerWidth + this.r) { 
      this.x = 0 - this.r;
      //this.x = innerWidth - this.r;
      //this.vx *= -1;
    }
    if(this.y > innerHeight + this.r) { 
      this.y = 0 - this.r;
      //this.y = innerHeight - this.r;
      //this.vy *= -1;
    }
    
    if(Math.random() < 0.05) {
      const theta = Math.PI * 2 * Math.random();
      this.to_ax = Math.cos(theta);
      this.to_ay = Math.sin(theta);
      
      //this.to_ax += (Math.random()*2 - 1) * 0.5;
      //this.to_ay += (Math.random()*2 - 1) * 0.5;
      //[this.ax, this.ay] = this.normalize(this.ax, this.ay); 
      /*
      if(Math.random() < 0.1) {
        const h = (timestamp / 1000 | 0) % 32;
        //this.to_hue = (Math.random() * 2 - 1) * 0.5 + (h / 2.0);
        this.to_hue = h / 31 - Math.random();
      }
      */
    }
    
    this.flock *= 0.9;
    if(this.flock < 10) {
      this.to_hue = this.hue_origin;
    }
    
    this.tail.push([this.x, this.y]);
    if(this.tail.length > 20) {
      this.tail.shift();
    }
    
    this.frame_count += 1;
  }
  
  draw(g) {
    /*
    let ux, uy;
    [ux, uy] = this.normalize(this.vx, this.vy);
    const d = 5;
    g.beginPath();
    g.moveTo(this.x - ux * d, this.y - uy * d);
    g.lineTo(this.x + ux * d, this.y + uy * d);
    g.stroke();
    */
    //g.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    if(this.tail.length > 1) {
      g.beginPath();
      g.moveTo(this.tail[0][0], this.tail[0][1]);
      for(let i = 1; i < this.tail.length; i++) {
        const dx = this.tail[i][0] - this.tail[i-1][0];
        const dy = this.tail[i][1] - this.tail[i-1][1];
        const d = Math.sqrt(dx*dx+dy*dy);
        if(d < 100) {
          g.lineTo(this.tail[i][0], this.tail[i][1]);  
        }
        else {
          g.moveTo(this.tail[i][0], this.tail[i][1]);
        }
      }
      g.strokeStyle = `hsla(${this.hue*360}deg,${this.sat}%,${this.lig}%, ${ctrl.opacity})`;
      g.stroke();  
    }
  }
  
  draw_info(g) {
    g.beginPath();
    g.arc(this.x, this.y, ctrl.r_d, 0, Math.PI * 2);
    g.stroke();  
  }
}

export { Ptcl, ctrl };