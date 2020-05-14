import { Ptcl, ctrl } from './ptcl.js';

const g = document.querySelector('#canvas').getContext('2d');
g.canvas.width = innerWidth;
g.canvas.height = innerHeight;
const ptcls = [];

window.ctrl = ctrl;
window.clear_bg = true;

function update(timestamp) {
  ctrl.opacity += (ctrl.to_opacity - ctrl.opacity) * 0.1;
  for(let i = 0; i < ptcls.length; i++) {
    ptcls[i].update(ptcls, timestamp);
  }
}

function draw(g, timestamp) {
  if(window.clear_bg) {
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);  
  }
  //g.fillStyle = 'rgba(255, 255, 255, 0.02)';
  //g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  //const c = (Math.sin(timestamp*0.0001)*0.5+0.5) * 360;
  //g.strokeStyle = `hsla(${c}, 100%, 50%, 1)`;
  //g.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  /*
  for(let i = 0; i < ptcls.length; i++) {
    ptcls[i].draw_info(g);
  }
  */
  
  g.lineWidth = 5;
  for(let i = 0; i < ptcls.length; i++) {
    ptcls[i].draw(g);
  }
}

function animate(timestamp) {
  update(timestamp);
  draw(g, timestamp);
  requestAnimationFrame(animate);
}

function layout() {
  g.canvas.width = innerWidth;
  g.canvas.height = innerHeight;
}

function init() {
  for(let i = 0; i < 150; i++) {
    const ptcl = new Ptcl();
    ptcls.push(ptcl);
  }
  
  window.addEventListener('resize', layout);
  
  window.ptcls = ptcls;
  animate();
}

init();