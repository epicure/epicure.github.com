export class Jamo {
    constructor(lens, type, insta_id, x, y ) {
        this.lens = lens;
        this.type = type;
        this.insta_id = insta_id;
        this.x = x;
        this.y = y;
        this.r = 35;
        this.vx = 0;
        this.vy = 0;
        this.rot = 0;
        this.to_rot = this.rot;
        this.path = null;
        this.path = lens.path;
        this.path_scale = type === 'JA' ? 0.1 : 0.05;
        this.fix_hue = 60 + (Math.random() < 0.3 ? Math.random() * 30 : Math.random() * 5) | 0;
        this.hue = this.fix_hue;
        this.to_hue = this.fix_hue;
        this.color = `hsl(${this.hue}deg, 10%, 50%)`;
        this.wait = 1;
        this.conn = [];
    }

    update() {
        this.x += this.vx * 0.05;
        this.y += this.vy * 0.05;
        
        this.rot += (this.to_rot - this.rot) * 0.05;
        let R = (innerWidth / innerHeight) > 1 ? 35 : 50;
        this.r += (R - this.r) * 0.1;
        
        if(this.x + this.r*2 < 0) { 
        this.x = g.canvas.width + this.r*2;
        }
        else if(this.y + this.r*2 < 0) {
        this.y = g.canvas.height + this.r*2;
        } 
        else if(this.x - this.r*2 > g.canvas.width) {
        this.x = 0 - this.r*2;
        }
        else if(this.y - this.r*2 > g.canvas.height) {
        this.y = 0 - this.r*2;
        }
        
        if(this.wait > 0) {
        this.wait -= 1;
        if(this.wait === 0) {
            this.wait = (60 + Math.random() * 120) | 0;
            if(this.type === 'MO' && Math.random() < 0.2) {
            this.to_rot = ((Math.random() * 2 - 1) * 4 | 0) * Math.PI / 2;  
            }
        }
        }
    }

    draw(bg, c, selected_jamo) {
        if(this !== selected_jamo) {
            this.to_hue += (this.fix_hue - this.to_hue) * 0.01;
        }
        this.hue += (this.to_hue - this.hue) * 0.1;
        this.color = `hsl(${this.hue}deg, 10%, 50%)`;
        
        //bg.fillStyle = '#ffffb4';
        bg.fillStyle = this.color;
        bg.save();
        bg.translate(this.x, this.y);
        bg.scale(0.4, 0.4);
        bg.beginPath();
        bg.arc(0, 0, this.r * 2.25, 0, Math.PI * 2);
        bg.fill();
        bg.restore();
        
        c.lineWidth = 8 * 2;
        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.rot);
        c.scale(this.path_scale, this.path_scale);
        c.translate(-256, -256);
        c.fill(this.path);
        c.restore();
    }
}