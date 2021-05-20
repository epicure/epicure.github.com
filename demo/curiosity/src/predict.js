/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

 import {IMAGENET_CLASSES} from '../lib/imagenet_classes.js';
 
 const MOBILENET_MODEL_PATH =
     // tslint:disable-next-line:max-line-length
     'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';
 
 const IMAGE_SIZE = 224;
 const TOPK_PREDICTIONS = 10;

 let g = document.createElement('canvas').getContext('2d');
 g.canvas.width = IMAGE_SIZE;
 g.canvas.height = IMAGE_SIZE;
 
 let mobilenet;
 const mobilenetDemo = async () => {
    status('Loading model...');

    mobilenet = await tf.loadLayersModel(MOBILENET_MODEL_PATH);

    // Warmup the model. This isn't necessary, but makes the first prediction
    // faster. Call `dispose` to release the WebGL memory allocated for the return
    // value of `predict`.
    mobilenet.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3])).dispose();

    status('');
 };
 
 /**
  * Given an image element, makes a prediction through mobilenet returning the
  * probabilities of the top K classes.
  */
 async function predict(imgElement) {
    status('떠올리는 중...');

    g.fillStyle = 'white';
    g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    g.drawImage(imgElement, 0, 0);

    const startTime = performance.now();
    const logits = tf.tidy(() => {
        // tf.browser.fromPixels() returns a Tensor from an image element.
        const img = tf.browser.fromPixels(g.canvas).toFloat();

        const offset = tf.scalar(127.5);
        // Normalize the image from [0, 255] to [-1, 1].
        const normalized = img.sub(offset).div(offset);

        // Reshape to a single-element batch so we can pass it to predict.
        const batched = normalized.reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3]);

        // Make a prediction through mobilenet.
        return mobilenet.predict(batched);
    });

    // Convert logits to probabilities and class names.
    const classes = await getTopKClasses(logits, TOPK_PREDICTIONS);
    const totalTime = performance.now() - startTime;
    //status(`Done in ${Math.floor(totalTime)}ms`);

    // Show the classes in the DOM.
    showResults(imgElement, classes);
 }
 
 /**
  * Computes the probabilities of the topK classes given logits by computing
  * softmax to get probabilities and then sorting the probabilities.
  * @param logits Tensor representing the logits from MobileNet.
  * @param topK The number of top predictions to show.
  */
 export async function getTopKClasses(logits, topK) {
    const values = await logits.data();

    const valuesAndIndices = [];
    for (let i = 0; i < values.length; i++) {
        valuesAndIndices.push({value: values[i], index: i});
    }
    valuesAndIndices.sort((a, b) => {
        return b.value - a.value;
    });
    const topkValues = new Float32Array(topK);
    const topkIndices = new Int32Array(topK);
    for (let i = 0; i < topK; i++) {
        topkValues[i] = valuesAndIndices[i].value;
        topkIndices[i] = valuesAndIndices[i].index;
    }

    const topClassesAndProbs = [];
    for (let i = 0; i < topkIndices.length; i++) {
        topClassesAndProbs.push({
        className: IMAGENET_CLASSES[topkIndices[i]],
        probability: topkValues[i]
        })
    }
    return topClassesAndProbs;
 }
 
const demoStatusElement = document.querySelector('#status');
const status = msg => demoStatusElement.innerText = msg;

function showResults(imgElement, classes) {
    status(``);
    let el_info = document.querySelector('#info');

    let best = classes[0].className.split(',').map(x => x.trim()).filter(x => x.length > 0);

    let keyword = best[best.length * Math.random() | 0];
    //let G_query = 'https://www.google.com/search?q=' + query.split(' ').join('+') + '+' + keyword.split(' ').join('+');
    //let N_query = 'https://search.naver.com/search.naver?query=' + query.split(' ').join('+') + '+' + keyword.split(' ').join('+');

    el_info.style.display = 'block';
    document.querySelector('#info #keyword').innerText = keyword;
    
    let el_piece = el_info.querySelector('.c-piece');
    el_piece.innerHTML = '';
    imgElement.style = 'width: 40px; height: 40px;';
    el_piece.appendChild(imgElement);

    let el_ge = document.querySelector('#info #G-explore');
    let el_ne = document.querySelector('#info #N-explore');

    el_ge.onclick = function(e) {
        let query = document.querySelector('#info #query').innerText;
        let G_query = 'https://www.google.com/search?q=' + query.split(' ').join('+') + '+' + keyword.split(' ').join('+');
        e.target.setAttribute('href', G_query);
    };

    el_ne.onclick = function(e) {
        let query = document.querySelector('#info #query').innerText;
        let G_query = 'https://search.naver.com/search.naver?query=' + query.split(' ').join('+') + '+' + keyword.split(' ').join('+');
        e.target.setAttribute('href', G_query);
    };
    
    document.querySelector('#info #query').focus();
}
 
mobilenetDemo();
 
export {
    predict,
}