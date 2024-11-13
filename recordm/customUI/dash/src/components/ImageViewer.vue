<template>
    <div class="flex">

        <div class="flex flex-col  w-7/12">
            <input class="pt-2" ref="input" type="file" accept="image/*" @change="setImage" />

            <div class="img-cropper block">
                <vue-cropper id="vuecropper-elem" class="max-h-[70vh]" v-if="imgSrc" ref="cropper" :src="imgSrc"
                    preview=".preview" :viewMode="2" :dragMode="'move'" :modal="true" :highlight="true"
                    @ready="onCropperReady" @zoom="handleZoom" @cropmove="handleMove"
                    :imgStyle="{ display: 'block', maxWidth: '100%' }" />
            </div>


            <div v-if="imgSrc" class="flex flex-wrap gap-y-1 pt-2">
                <a class="bg-blue-600 text-stone-200 font-light rounded-l-md border-2 border-stone-800 px-2 py-1"
                    href="#" role="button" @click.prevent="setDragMode('move')">
                    <i class="fa-solid fa-up-down-left-right"></i>
                </a>
                <a class="bg-blue-600 text-stone-200 font-light rounded-r-md border-2 border-stone-800 px-2 py-1 mr-1"
                    href="#" role="button" @click.prevent="setDragMode('crop')">
                    <i class="fa-solid fa-crop-simple"></i>
                </a>

                <a class="bg-blue-600 text-stone-200 font-light rounded-l-md border-2 border-stone-800 px-2 py-1"
                    href="#" role="button" @click.prevent="zoom(0.2)">
                    <i class="fa-solid fa-magnifying-glass-plus"></i>
                </a>
                <a class="bg-blue-600 text-stone-200 font-light rounded-r-md border-2 border-stone-800 px-2 py-1 mr-1"
                    href="#" role="button" @click.prevent="zoom(-0.2)">
                    <i class="fa-solid fa-magnifying-glass-minus"></i>
                </a>

                <a class="bg-blue-600 text-stone-200 font-light rounded-l-md border-2 border-stone-800 px-2 py-1"
                    href="#" role="button" @click.prevent="move(-10, 0)">
                    <i class="fa-solid fa-arrow-left"></i>
                </a>
                <a class="bg-blue-600 text-stone-200 font-light border-2 border-stone-800 px-2 py-1" href="#"
                    role="button" @click.prevent="move(10, 0)">
                    <i class="fa-solid fa-arrow-right"></i>
                </a>
                <a class="bg-blue-600 text-stone-200 font-light  border-2 border-stone-800 px-2 py-1" href="#"
                    role="button" @click.prevent="move(0, -10)">
                    <i class="fa-solid fa-arrow-up"></i>
                </a>
                <a class="bg-blue-600 text-stone-200 font-light rounded-r-md border-2 border-stone-800 px-2 py-1 mr-1"
                    href="#" role="button" @click.prevent="move(0, 10)">
                    <i class="fa-solid fa-arrow-down"></i>
                </a>

                <a class="bg-blue-600 text-stone-200 font-light rounded-l-md border-2 border-stone-800 px-2 py-1"
                    href="#" role="button" @click.prevent="rotate(90)">
                    <i class="fa-solid fa-rotate-right"></i>
                </a>
                <a class="bg-blue-600 text-stone-200 font-light rounded-r-md border-2 border-stone-800 px-2 py-1 mr-1"
                    href="#" role="button" @click.prevent="rotate(-90)">
                    <i class="fa-solid fa-rotate-left"></i>
                </a>

                <a class="bg-blue-600 text-stone-200 font-light rounded-md border-2 border-stone-800 px-2 py-1 mr-1"
                    href="#" role="button" @click.prevent="cropImage">
                    <i class="fa-solid fa-scissors"></i>
                </a>

                <a class="bg-blue-600 text-stone-200 font-light rounded-l-md border-2 border-stone-800 px-2 py-1"
                    href="#" role="button" @click.prevent="enableCropper">
                    <i class="fa-solid fa-lock-open"></i>
                </a>
                <a class="bg-blue-600 text-stone-200 font-light rounded-r-md border-2 border-stone-800 px-2 py-1 mr-1"
                    href="#" role="button" @click.prevent="disableCropper">
                    <i class="fa-solid fa-lock"></i>
                </a>

                <a class="bg-blue-600 text-stone-200 font-light rounded-l-md border-2 border-stone-800 px-2 py-1"
                    href="#" role="button" @click.prevent="cropCrop">
                    <i class="fa-solid fa-check"></i>
                </a>
                <a class="bg-blue-600 text-stone-200 font-light rounded-r-md border-2 border-stone-800 px-2 py-1 mr-1"
                    href="#" role="button" @click.prevent="clearCrop">
                    <i class="fa-solid fa-xmark"></i>
                </a>

                <br />

                <a class="bg-blue-600 text-stone-200 font-light rounded-md border-2 border-stone-800 p-1 mr-1" href="#"
                    role="button" @click.prevent="reset">
                    Reset
                </a>

                <a class="font-light rounded-md border-2 border-stone-800 p-1" href="#" role="button"
                    @click.prevent="getCanvasData">
                    Get Canvas Data
                </a>

                <a class="font-light rounded-l-md border-2 border-stone-800 p-1" href="#" role="button"
                    @click.prevent="getData">
                    Get Data
                </a>
                <a class="font-light rounded-r-md border-2 border-stone-800 p-1 mr-1" href="#" role="button"
                    @click.prevent="setDataText">
                    Set Data
                </a>

                <a class="font-light rounded-l-md border-2 border-stone-800 p-1" href="#" role="button"
                    @click.prevent="getCropBoxData">
                    Get CropBox Data
                </a>
                <a class="font-light rounded-r-md border-2 border-stone-800 p-1 mr-1" href="#" role="button"
                    @click.prevent="setCropBoxDataText">
                    Set CropBox Data
                </a>
            </div>

        </div>


        <div class="flex flex-col ml-2 w-5/12 items-stretch">
            <div class="w-full flex flex-col items-center" v-if="imgSrc">
                <p class="font-bold">Preview</p>
                <div id="preview-wrapper" class="preview overflow-hidden w-full h-40"></div>
            </div>

            <div class="flex gap-x-2">
                <button v-if="imgSrc" class="font-bold rounded-md border-2 border-stone-800 px-2 
            bg-blue-500 text-stone-200
            py-1 mt-2 w-full" v-on:click="cropAndRecognize">
                    Crop & Extract <i class="fa-solid fa-eye"></i>
                </button>
                <button v-if="imgSrc" class="font-bold rounded-md border-2 border-stone-800 px-2 
            bg-indigo-500 text-stone-200
            py-1 mt-2 w-full" v-on:click="cropAndReadCode">
                    Crop & Read QR <i class="fa-solid fa-qrcode"></i>
                </button>
            </div>


            <hr class="my-1" />

            <Waiting2 v-if="loadingOcr || loadingQr" />
            <div v-if="ocrText" class="grow">
                <div class="font-bold">Extracted OCR</div>
                <div> {{ ocrText }} </div>
            </div>

            <div v-if="qrText" class="grow">
                <div class="font-bold">Extracted QR Code</div>
                <div> {{ qrText }} </div>
            </div>

            <div class="flex">
                <div v-if="cropBoxData" class="w-6/12"> <span class="font-bold">Crop Box Data</span>
                    <hr>
                    <textarea class="w-full" v-model="cropBoxData"></textarea>
                </div>
                <div v-if="viewData" class="w-6/12"> <span class="font-bold">View Data</span>
                    <hr>
                    <textarea class="w-full" v-model="viewData"></textarea>
                </div>
                <div v-if="canvasData" class="w-6/12"> <span class="font-bold">Canvas Data</span>
                    <hr>
                    <textarea class="w-full" v-model="canvasData"></textarea>
                </div>
                <div v-if="currentRatio" class="w-6/12"> <span class="font-bold">Ratio</span>
                    <hr>
                    <textarea class="w-full" v-model="currentRatio"></textarea>
                </div>
            </div>
        </div>
    </div>


</template>

<script>
import { createWorker } from 'tesseract.js';
import VueCropper from 'vue-cropperjs';
import 'cropperjs/dist/cropper.css';
import Waiting2 from './shared/Waiting2.vue';
import { BrowserMultiFormatReader } from '@zxing/browser';
import jsQR from "jsqr";


export default {
    components: {
        VueCropper,
        Waiting2
    },
    data: () => ({
        imgSrc: '',
        cropImg: '',
        // For debug
        canvasData: undefined,
        cropBoxData: undefined,
        viewData: undefined,
        currentRatio: undefined,

        // Store ocr and qr code related
        ocrText: '',
        qrText: '',
        loadingOcr: false,
        loadingQr: false,

        // Movement logic related
        initialRatio: undefined,
        currRatio: undefined,
        currCropData: undefined,
        lastCropRectInBounds: undefined,
    }),
    computed: {
        options() { return this.component['ViewerCustomize'][0]; },
        classes() { return this.options['ViewerClasses'] || ""; },
        definition() { return "" },
        outputVar() { return this.component["OutputVarViewer"] },
        imageUrl() { return this.component["ViewerImageURL"] },
    },
    props: {
        component: Object
    },
    methods: {
        onCropperReady() {
            this.clearCrop()
            this.zoom(0.01) //we zoom in and zoom out to force the cropper to init the canvas :)
            this.zoom(-0.01)
        },
        async cropAndRecognize() {
            this.cropImage()
            await this.recognize()
        },
        async cropAndReadCode() {
            this.cropImage()
            this.loadingQr = true
            const codeReader = new BrowserMultiFormatReader();
            let first_success = false

            // Uses zxing
            try {
                const result = await codeReader.decodeFromImageUrl(this.imgSrc);
                console.log("QR Code Content:", result);
                this.qrText = result.text
                this.setOutputVar(result.text)
                first_success = true
                console.log("QR Code Content ATCUD processed: ", this.parseATCUD(result.text))
            } catch (error) {
                console.log('Error: Could not read QR code with zxing')
            }

            // If zxing isnt able to find a QR code, we run the second library :)
            if (!first_success) {
                // Uses jsqr
                try {
                    let croppedCanvas = this.$refs.cropper.getCroppedCanvas()
                    let imgData = croppedCanvas.getContext("2d").getImageData(0, 0, croppedCanvas.width, croppedCanvas.height)
                    const code = jsQR(imgData.data, croppedCanvas.width, croppedCanvas.height)
                    this.qrText = code.data
                    this.setOutputVar(code.data)
                    console.log("QR Code Content ATCUD processed: ", this.parseATCUD(code.data))
                } catch (error) {
                    console.log('Error v2: Could not read QR code with jsqr')
                }
            }
            this.loadingQr = false
        },
        async recognize() {
            let worker
            try {
                this.loadingOcr = true
                worker = await createWorker(['eng', 'spa'], 1, {
                    logger: (m) => console.log(m),
                    workerPath: "localresource/js/lib/worker.min.js",
                    workerBlobURL: false,
                })

                const ocrData = await worker.recognize(this.cropImg);
                this.ocrText = ocrData.data.text
                this.setOutputVar(ocrData.data.text)
                console.log("ocr data", this.ocrText, ocrData);
            } catch (exce) {
                console.log("Error running OCR: ", exce)
            } finally {
                this.loadingOcr = false
                if (worker) { await worker.terminate() }
            }
        },
        setDragMode(dragMode) {
            this.$refs.cropper.setDragMode(dragMode);
        },
        cropImage() {
            // get image data for post processing, e.g. upload or setting image src
            this.cropImg = this.$refs.cropper.getCroppedCanvas().toDataURL('image/jpeg');
        },
        getCropBoxData() {
            this.cropBoxData = JSON.stringify(this.$refs.cropper.getCropBoxData(), null, 4);
        },
        getData() {
            this.viewData = JSON.stringify(this.$refs.cropper.getData(true), null, 4);
        },
        getCanvasData() {
            this.canvasData = JSON.stringify(this.$refs.cropper.getCanvasData(), null, 4);
        },
        reset() {
            this.initialRatio = null
            this.$refs.cropper.reset();
        },
        rotatePoint(x, y, cx, cy, angle) {
            const radians = angle * (Math.PI / 180); // Convert angle to radians
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            // Apply rotation formula
            const xNew = cx + (x - cx) * cos - (y - cy) * sin;
            const yNew = cy + (x - cx) * sin + (y - cy) * cos;

            return { x: xNew, y: yNew };
        },
        rotate(deg) {
            const cropper = this.$refs.cropper
            if (!cropper) return;
            cropper.rotate(deg); // rotate

            let { x, y, width, height, rotate } = cropper.getData(true) // get prev values
            let totalAngle = rotate + deg

            const canvasData = cropper.getCanvasData()
            let cw = canvasData.naturalWidth
            let ch = canvasData.naturalHeight
            let cx = cw / 2
            let cy = ch / 2
            console.log("centers", cw, ch, cx, cy)

            let rotatedXY = this.rotatePoint(x, y, cx, cy, deg)

            let newX = rotatedXY.x
            let newY = rotatedXY.y

            // Adjust the width and height based on 90-degree rotations
            const rotatedWidth = totalAngle % 180 === 0 ? width : height;
            const rotatedHeight = totalAngle % 180 === 0 ? height : width;

            console.log("Rotated X,Y", rotatedXY)
            console.log("Rotated Width Height", rotatedWidth, rotatedHeight)

            setTimeout(() => {
                this.currCropData = { newX, newY, rotatedWidth, rotatedHeight, totalAngle }
                cropper.initCrop();
                this.setData(this.currCropData);
            }, 1000)

        },
        setCropBoxDataText() {
            if (!this.cropBoxData) return;
            this.$refs.cropper.setCropBoxData(JSON.parse(this.cropBoxData));
        },
        setCropBoxData(left, top, width, height) {
            this.$refs.cropper.setCropBoxData({ left: left, top: top, width: width, height: height });
        },
        move(offsetX, offsetY) {
            const cropper = this.$refs.cropper;
            if (!cropper) return;

            let cropperData = this.currCropData || cropper.getData(true);
            cropper.move(offsetX, offsetY);

            if (this.checkBounds(cropperData)) {
                cropper.initCrop();
                this.currCropData = cropperData;
                this.setData(cropperData);
            } else {
                cropper.clear();
            }
        },
        handleMove(e) {
            const cropper = this.$refs.cropper;
            if (!cropper) return;

            let action = e.detail.action;
            if (action === "move" || action === "zoom") {
                const cropperData = this.currCropData || cropper.getData(true);
                if (this.checkBounds(cropperData)) {
                    this.currCropData = cropperData;
                    this.setData(cropperData);
                    cropper.initCrop();
                } else {
                    cropper.clear();
                }
            } else {
                this.currCropData = cropper.getData(true);
            }
        },
        checkBounds(cropperData) {
            const cropper = this.$refs.cropper;
            if (!cropper) return false;

            const canvasData = cropper.getCanvasData();
            const { imgLeft, imgTop, imgRight, imgBottom } = this.convertCanvasToImageSpace(canvasData, this.currRatio);

            // Calculate crop box coordinates
            const { x: cb_left, y: cb_top, width: cb_width, height: cb_height } = cropperData;
            const cb_right = cb_left + cb_width;
            const cb_bottom = cb_top + cb_height;

            // Check if cropped area is within bounds
            const in_x_bounds = imgLeft < cb_left && cb_left < imgRight && imgLeft < cb_right && cb_right < imgRight;
            const in_y_bounds = imgTop < cb_top && cb_top < imgBottom && imgTop < cb_bottom && cb_bottom < imgBottom;

            return in_x_bounds && in_y_bounds;
        },
        handleZoom(e) {
            // GETS CALLED **BEFORE** the libraries' zoom function
            const cropper = this.$refs.cropper
            if (!cropper) return;

            const newRatio = Number(e.detail.ratio.toFixed(3))
            const prevRatio = Number(e.detail.oldRatio.toFixed(3))

            // Initialize virtual crop box if not already set
            if (!this.initialRatio) {
                this.initialRatio = prevRatio
            }

            // Dont allow zooming out if ratio is lower than the initial value
            if (this.initialRatio > newRatio) {
                return
            }
            this.currRatio = newRatio

            // Get canvas data to determine the bounds
            const cropperData = this.currCropData ? this.currCropData : cropper.getData(true)
            const canvasData = cropper.getCanvasData();
            let { imgLeft, imgTop, imgRight, imgBottom } = this.convertCanvasToImageSpace(canvasData, newRatio)
            //this.currentRatio = JSON.stringify({ "r": e.detail.ratio })

            // "Calculate" dropbox coords
            let { x: cb_left, y: cb_top, width: cb_width, height: cb_height } = cropperData;

            let cb_right = cb_left + cb_width
            let cb_bottom = cb_top + cb_height

            // Check if cropped area is out of bounds
            let in_x_bounds = (imgLeft < cb_left) && (cb_left < imgRight) && (imgLeft < cb_right) && (cb_right < imgRight)
            let in_y_bounds = (imgTop < cb_top) && (cb_top < imgBottom) && (imgTop < cb_bottom) && (cb_bottom < imgBottom)
            if (in_x_bounds && in_y_bounds) {
                // Function to try cropping data update
                const tryUpdatingCropData = (delay) => {
                    setTimeout(() => {
                        let newCropboxData = cropper.getData(true);
                        if (Math.round(newCropboxData.x) !== Math.round(cb_left) || Math.round(newCropboxData.y) !== Math.round(cb_top)) {
                            let newData = { x: cb_left, y: cb_top, width: cb_width, height: cb_height, rotate: cropperData.rotate };
                            cropper.initCrop();
                            this.currCropData = newData;
                            this.setData(newData);
                        }
                    }, delay);
                };
                // Try updating with different delays
                tryUpdatingCropData(10);
                tryUpdatingCropData(20);
            } else {
                this.$refs.cropper.clear()
            }
        },
        // Só deus sabe a lógica matemática que aqui vai...
        convertCanvasToImageSpace(canvasData, newRatio) {
            // Determine future coordinates of canvas
            const newCanvasWidth = Math.round(canvasData.naturalWidth * newRatio) // get future canvas width
            const newCanvasHeight = Math.round(canvasData.naturalHeight * newRatio)// get future canvas height
            let canvas_offsetX = Math.round((newCanvasWidth - canvasData.width) / 2); //get canvas X offset
            let canvas_offsetY = Math.round((newCanvasHeight - canvasData.height) / 2); //get canvas Y offset

            const containerData = this.$refs.cropper.getContainerData()

            let newCanvasLeft = canvasData.left - canvas_offsetX // apply offset X to get future canvas X
            let newCanvasTop = canvasData.top - canvas_offsetY // aply offset Y to get future canvas Y
            let offX = containerData.width / newRatio
            let offY = containerData.height / newRatio

            // Convert future canvas coords to image coordinates
            let imgTop = Math.round(-1 * newCanvasTop / newRatio)
            let imgLeft = Math.round(-1 * newCanvasLeft / newRatio)
            let imgRight = Math.round(imgLeft + offX)
            let imgBottom = Math.round(imgTop + offY)

            return { imgLeft, imgTop, imgRight, imgBottom }
        },
        highlightBox(fieldIdx) {
            // Reset cropper state everything
            this.reset()
            this.cropCrop()

            // Get original image coordinates
            let fieldData = this.fields[fieldIdx]
            let left = fieldData.left
            let top = fieldData.top
            let width = fieldData.width
            let height = fieldData.height

            // Retrieve cropper data
            const canvasData = this.$refs.cropper.getCanvasData()

            left = left //+ canvasData.left
            top = top //+ canvasData.top

            let scaleX = canvasData.width / canvasData.naturalWidth
            let scaleY = canvasData.height / canvasData.naturalHeight
            width = width * scaleX
            height = height * scaleY

            // Calculate new crop box dimensions
            const newCropBoxData = {
                left: left,
                top: top,
                width: width,
                height: height
            };
            this.setData({ x: newCropBoxData.left, y: newCropBoxData.top, width: newCropBoxData.width, height: newCropBoxData.height, scaleX: 1, scaleY: 1, rotate: 0 })
        },
        setDataText() {
            if (!this.viewData) return;
            this.$refs.cropper.setData(JSON.parse(this.viewData));
        },
        setData(newData) {
            let new_data = {
                x: newData.x, y: newData.y, width: newData.width, height: newData.height,
                scaleX: 1, scaleY: 1, rotate: newData.rotate
            }
            this.currCropData = new_data
            this.$refs.cropper.setData(new_data);
        },
        setImage(e) {
            const file = e.target.files[0];
            if (file.type.indexOf('image/') === -1) {
                alert('Please select an image file');
                return;
            }
            if (typeof FileReader === 'function') {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.imgSrc = event.target.result;
                    // rebuild cropperjs with the updated source
                    if (this.$refs.cropper) {
                        this.$refs.cropper.replace(event.target.result);
                    }
                };
                reader.readAsDataURL(file);
            } else {
                alert('Sorry, FileReader API not supported');
            }
        },
        setFile(e) {
            const file = e.target.files[0];
            const fileType = file.type;

            if (fileType.indexOf('image/') === 0) {
                // Handle image files
                if (typeof FileReader === 'function') {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.imgSrc = event.target.result;
                        if (this.$refs.cropper) {
                            this.$refs.cropper.replace(event.target.result);
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Sorry, FileReader API not supported');
                }
            } else if (fileType === 'application/pdf') {
                // Handle PDF files
                // IF we got pdf.js to work, we could use it to convert to
                // an image here
                if (typeof FileReader === 'function') {
                    const reader = new FileReader();
                    reader.onload = async (e) => {

                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Sorry, FileReader API not supported');
                }
            } else {
                alert('Please select an image or PDF file');
            }
        },
        setOutputVar(outputText) {
            this.$set(this.component.vars, this.outputVar, outputText)
        },
        showFileChooser() {
            this.$refs.input.click();
        },
        zoom(percent) {
            this.$refs.cropper.relativeZoom(percent);
        },
        enableCropper() {
            this.$refs.cropper.enable()
        },
        disableCropper() {
            this.$refs.cropper.disable()
        },
        cropCrop() {
            this.$refs.cropper.initCrop()
        },
        clearCrop() {
            this.$refs.cropper.clear()
            this.currCropData = undefined
        },
        parseATCUD(input) {
            const result = {};
            const pairs = input.split('*');

            pairs.forEach(pair => {
                const [key, value] = pair.split(':');
                if (key && value) {
                    result[key] = value;
                }
            });

            return result;
        }
    },
}
</script>