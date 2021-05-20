let lens_collection = [];

class Lens {
    constructor(img, path_string) {
        this.img = img;
        this.img.width = 224;
        this.img.height = 224;
        this.path_string = path_string;
        this.path = new Path2D(path_string);
    }
}

export {
    lens_collection,
    Lens,
}