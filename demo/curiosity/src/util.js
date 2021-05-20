import { Potrace } from '../lib/potrace.js';
import { lens_collection, Lens } from './lens_collection.js';

const g_capture = document.createElement('canvas').getContext('2d');
const CSIZE = 512;
[g_capture.canvas.width, g_capture.canvas.height] = [CSIZE, CSIZE];

const g_temp= document.createElement('canvas').getContext('2d');
[g_temp.canvas.width, g_temp.canvas.height] = [100, 100];

const g_piece = document.createElement('canvas').getContext('2d');
[g_piece.canvas.width, g_piece.canvas.height] = [64, 64];

let el_hidden_svg = document.querySelector('#hidden_svg');

function convert_image_to_lens(img, callback) {
    g_capture.fillStyle = 'white';
    g_capture.fillRect(0, 0, g_capture.canvas.width, g_capture.canvas.height);
    g_capture.drawImage(img, 0, 0, CSIZE, CSIZE);
    
    let im = g_capture.getImageData(0, 0, g_capture.canvas.width, g_capture.canvas.height);

    for(let i = 0; i < im.data.length / 4; i++) {
        let R = im.data[4 * i + 0];
        let G = im.data[4 * i + 1];
        let B = im.data[4 * i + 2];
        let score = 1.0 - Math.min(Math.min(R, G), B) / 255.0;
        let v = 255;
        if(score > 0.08) {
            v = 0;
        }
        im.data[4 * i + 0] = v;
        im.data[4 * i + 1] = v;
        im.data[4 * i + 2] = v;
    }

    g_capture.clearRect(0, 0, g_capture.canvas.width, g_capture.canvas.height);
    g_capture.drawImage(img, 0, 0, CSIZE, CSIZE);
    
    Potrace.loadBm(im);
    Potrace.process(() => {
        let path_string = organize_path_string(Potrace.getPathString()).map(p => p.getAttribute('d')).join(' ');
        g_capture.canvas.toBlob((blob) => {
            let newImg = new Image();
            let _url = URL.createObjectURL(blob);

            newImg.onload = function(evt) {
                let lens = new Lens(newImg, path_string);
                lens_collection.push(lens);
                if(callback) {
                    callback(lens);
                }
                URL.revokeObjectURL(_url);
                evt.target.onload = null;
            };

            newImg.src = _url;
        });
    });
}

function load_image_to_lens_collection(url, callback) {
    let image = new Image();
    image.src = url;
    image.onload = function(e) {
        let img = e.target;
        convert_image_to_lens(img, callback);
        img.onload = null;
    }
}

function organize_path_string(path_string) {
    let paths = '';
    let p_data = path_string
                    .split('M')
                    .filter(x => x.length > 0)
                    .map(x => ('M' + x).trim());
    for(let path_str of p_data) {
        paths += `<path d="${path_str}" style="stroke: black; stroke-width: 1; fill: none"/>`;
    }
    el_hidden_svg.innerHTML = paths;

    let el_paths = el_hidden_svg.querySelectorAll('path');
    let entries = [];
    for(let el_path of el_paths) {
        let bbox = el_path.getBBox();
        let area = bbox.width * bbox.height;
        
        if(area > 20 * 20) {
            let is_inner = false;
            for(let o_path of el_paths) {
                if(o_path !== el_path) {
                    let o_path_bbox = o_path.getBBox();
                    if(bbox.x > o_path_bbox.x &&
                    bbox.x + bbox.width < o_path_bbox.x + o_path_bbox.width &&
                    bbox.y > o_path_bbox.y &&
                    bbox.y + bbox.height < o_path_bbox.y + o_path_bbox.height) {
                        is_inner = true;
                        o_path.setAttribute('d', el_path.getAttribute('d') + ' ' + o_path.getAttribute('d'));
                    }
                }
            }
            if(!is_inner) {
                entries.push(el_path);
            }
        }
    }

    return entries;
}

function get_pieces_from_lens(lens, callback) {
    let entries = organize_path_string(lens.path_string);
    if(entries.length > 1) {
        for(let el_path of entries) {
            let p = new Path2D(el_path.getAttribute('d'));
            
            let bbox = el_path.getBBox();
            let sz = Math.max(bbox.width, bbox.height) + 2 | 0;
            let dx = 0;
            let dy = 0;
            if(bbox.width > bbox.height) {
                dy = (sz - bbox.height) * 0.5;
            }
            else {
                dx = (sz - bbox.width) * 0.5;
            }
            g_temp.canvas.width = sz;
            g_temp.canvas.height = sz;
            
            g_temp.clearRect(0, 0, g_temp.canvas.width, g_temp.canvas.height);
            g_temp.save();
            g_temp.translate(-bbox.x + dx + 1, -bbox.y + dy + 1);
            g_temp.clip(p);
            g_temp.drawImage(lens.img, 0, 0, lens.img.naturalWidth, lens.img.naturalHeight);
            g_temp.restore();
    
            g_piece.clearRect(0, 0, g_piece.canvas.width, g_piece.canvas.height);
            g_piece.drawImage(g_temp.canvas, 0, 0, g_piece.canvas.width, g_piece.canvas.height);
    
            g_piece.canvas.toBlob((blob) => {
                let newImg = new Image();
                let url = URL.createObjectURL(blob);
    
                newImg.onload = function(e) {
                    if(callback) {
                        callback(e.target);
                    }
                    URL.revokeObjectURL(url);
                    e.target.onload = null;
                };
    
                newImg.src = url;
            });
        }
    }
}

export {
    convert_image_to_lens,
    load_image_to_lens_collection,
    get_pieces_from_lens,
};