<template>
    <div class="flex">

        <div class="flex flex-col  w-7/12">
            <input class="pt-2" ref="input" type="file" name="image" accept="image/*" @change="setImage" />

            <div class="img-cropper block">
                <vue-cropper class="max-h-[70vh]" v-if="imgSrc" ref="cropper" :src="imgSrc" preview=".preview"
                    :viewMode="2" :dragMode="'move'" :modal="true" :highlight="true" @ready="onCropperReady"
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
            <div v-if="imgSrc">
                <div class="font-bold">Fields Highlight Demo</div>
                <button v-on:click="() => highlightBox(0)" class="w-full text-sm text-left px-2 py-1">
                    <span class="font-bold">Apelido:</span>
                    <span class="font-light">Nunes Paiva da Silva</span>
                </button>
                <br>
                <button v-on:click="() => highlightBox(1)" class="w-full text-sm text-left px-2 py-1">
                    <span class="font-bold">Nacionalidade:</span>
                    <span class="font-light">BRA</span>
                </button>
                <br>
                <button v-on:click="() => highlightBox(2)" class="w-full text-sm text-left px-2 py-1">
                    <span class="font-bold">Data de Validade:</span>
                    <span class="font-light ">01 04 2034</span>
                </button>
            </div>
            <hr class="py-1">

            <div class="w-full flex flex-col items-center" v-if="imgSrc">
                <p class="font-bold">Preview</p>
                <div class="preview overflow-hidden w-full h-40"></div>
            </div>

            <button v-if="imgSrc" class="font-bold rounded-md border-2 border-stone-800 px-2 
            bg-blue-600 text-stone-200
            py-1 mt-2 w-full" v-on:click="cropAndRecognize">
                Crop & Extract <i class="fa-solid fa-eye"></i>
            </button>

            <hr class="my-1" />

            <Waiting2 v-if="loadingOcr" />
            <div v-if="ocrText" class="grow">
                <div class="font-bold">Extracted OCR</div>
                <div> {{ ocrText }} </div>
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
            </div>
        </div>
    </div>


</template>

<script>
import { createWorker } from 'tesseract.js';
import VueCropper from 'vue-cropperjs';
import 'cropperjs/dist/cropper.css';
import Waiting2 from './shared/Waiting2.vue';


export default {
    components: {
        VueCropper,
        Waiting2
    },
    data: () => ({
        imgSrc: '',
        cropImg: '',
        cropBoxData: undefined,
        viewData: undefined,
        ocrText: '',
        loadingOcr: false,
        fields: [
            { left: 368, top: 149.69800631000001, width: 166.74609375, height: 23.66015625 },
            { left: 457.6953125, top: 301.91675631, width: 44.2578125, height: 22.53125 },
            { left: 558.87109375, top: 351.05859375, width: 98.21875, height: 24.2109375 }
        ]
    }),
    props: {
        component: Object
    },
    methods: {
        onCropperReady() {
            this.clearCrop()
        },
        async cropAndRecognize() {
            this.cropImage()
            await this.recognize()
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
            this.viewData = JSON.stringify(this.$refs.cropper.getData(), null, 4);
        },
        move(offsetX, offsetY) {
            this.$refs.cropper.move(offsetX, offsetY);
        },
        reset() {
            this.$refs.cropper.reset();
        },
        rotate(deg) {
            this.$refs.cropper.rotate(deg);
        },
        setCropBoxDataText() {
            if (!this.cropBoxData) return;
            this.$refs.cropper.setCropBoxData(JSON.parse(this.cropBoxData));
        },
        setCropBoxData(left, top, width, height) {
            this.$refs.cropper.setCropBoxData(left, top, width, height);
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
                width: width ,
                height: height
            };
            this.setData({ x: newCropBoxData.left, y: newCropBoxData.top, width: newCropBoxData.width, height: newCropBoxData.height, scaleX:1, scaleY:1, rotate:0 })
        },
        setDataText() {
            if (!this.viewData) return;
            this.$refs.cropper.setData(JSON.parse(this.viewData));
        },
        setData(newData) {
            this.$refs.cropper.setData({ x: newData.x, y: newData.y, width: newData.width, height: newData.height,
                scaleX: newData.scaleX, scaleY:newData.scaleY, rotate:0
             });
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
        },
    },
}
</script>