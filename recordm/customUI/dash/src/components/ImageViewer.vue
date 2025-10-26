<template>
    <div :id="componentIdentifier" ref="viewerContainerRef" class="flex h-full">

        <div class="flex flex-col  w-full  h-full">
            <div ref="imageViewerToolbar" class="flex items-center justify-between mb-1 py-2 px-2 gap-x-0.5 flex-wrap border-t-[1px] border-x-[1px] rounded-t-md
            border-stone-400 bg-stone-200/30">
                <!-- TEMPORARILY HIDDEN UNTIL FUTURE NEED
                <a v-if="false" class="rounded-md relative mr-0.5" :class="buttonClasses">
                    <input class="hidden" ref="input" type="file" name="image" accept="image/*" @change="setImage"
                        id="fileInput" />

                    <label for="fileInput" class="hover:cursor-pointer">
                        <i class="fas fa-folder-open"></i>
                    </label>
                </a>
                -->

                <div class="flex flex-1 gap-x-2">
                    <div v-if="zoomButtons" class="flex  mr-0.5">
                        <a :class="buttonClasses" class="rounded-l-md" href="#" role="button" @click.prevent="zoom(0.2)"
                            title="Ctrl + +">
                            <i class="fa-solid fa-magnifying-glass-plus"></i>
                        </a>
                        <a :class="buttonClasses" class="rounded-r-md" href="#" role="button"
                            @click.prevent="zoom(-0.2)" title="Ctrl + -">
                            <i class="fa-solid fa-magnifying-glass-minus"></i>
                        </a>
                    </div>

                    <div v-if="modeSwitch" class="flex mr-0.5">
                        <a :class="buttonClasses" class="rounded-l-md" href="#" role="button"
                            @click.prevent="setDragMode('move')" title="Ctrl + ?">
                            <i class="fa-solid fa-up-down-left-right"></i>
                        </a>
                        <a :class="buttonClasses" class="" href="#" role="button" @click.prevent="setDragMode('crop')"
                            title="Ctrl + ?">
                            <i class="fa-solid fa-crop-simple"></i>
                        </a>
                        <a :class="buttonClasses" class="rounded-r-md" href="#" role="button" @click.prevent="clearCrop"
                            title="Ctrl + ?">
                            <i class="fa-solid fa-xmark"></i>
                        </a>
                    </div>

                    <!-- Used with invisible and aboslute to not occupy DOM and still be findable by customizations -->
                    <div class="flex mr-0.5 hidden">
                        <a :class="buttonClasses" class=" absolute" href="#" role="button" @click.prevent="move(20, 0)"
                            title="Ctrl + Left">
                            <i class="fa-solid fa-arrow-left"></i>
                        </a>
                        <a :class="buttonClasses" class="  absolute" href="#" role="button"
                            @click.prevent="move(-20, 0)" title="Ctrl + Right">
                            <i class="fa-solid fa-arrow-right"></i>
                        </a>
                        <a :class="buttonClasses" class=" absolute" href="#" role="button" @click.prevent="move(0, 20)"
                            title="Ctrl + Up">
                            <i class="fa-solid fa-arrow-up"></i>
                        </a>
                        <a :class="buttonClasses" class=" absolute" href="#" role="button" @click.prevent="move(0, -20)"
                            title="Ctrl + Down">
                            <i class="fa-solid fa-arrow-down"></i>
                        </a>
                    </div>

                    <!-- Used with invisible and aboslute to not occupy DOM and still be findable by customizations -->
                    <div class="flex mr-0.5 hidden">
                        <a :class="buttonClasses" class=" absolute" href="#" role="button"
                            @click.prevent="moveCropbox(-20, 0)" title="Ctrl + Left">
                            <i class="fa-solid fa-chevron-left"></i>
                        </a>
                        <a :class="buttonClasses" class=" absolute" href="#" role="button"
                            @click.prevent="moveCropbox(20, 0)" title="Ctrl + Right">
                            <i class="fa-solid fa-chevron-right"></i>
                        </a>
                        <a :class="buttonClasses" class=" absolute" href="#" role="button"
                            @click.prevent="moveCropbox(0, -20)" title="Ctrl + Up">
                            <i class="fa-solid fa-chevron-up"></i>
                        </a>
                        <a :class="buttonClasses" class=" absolute" href="#" role="button"
                            @click.prevent="moveCropbox(0, 20)" title="Ctrl + Down">
                            <i class="fa-solid fa-chevron-down"></i>
                        </a>
                    </div>

                    <div v-if="rotateButtons" class="flex mr-0.5">
                        <a :class="buttonClasses" class="rounded-l-md" href="#" role="button"
                            @click.prevent="rotate(90)" title="Ctrl + ?">
                            <i class="fa-solid fa-rotate-right"></i>
                        </a>
                        <a :class="buttonClasses" class="rounded-r-md" href="#" role="button"
                            @click.prevent="rotate(-90)" title="Ctrl + ?">
                            <i class="fa-solid fa-rotate-left"></i>
                        </a>
                    </div>

                    <div v-if="totalImages > 1" class="flex items-center gap-x-1 justify-end flex-1 mr-2">
                        <a :class="buttonClasses" class="rounded-l-md !text-xl" href="#" role="button"
                            @click.prevent="prevImage()" title="">
                            <i class="fa-solid fa-caret-left"></i>
                        </a>
                        <div class="font-light text-sm text-stone-400">
                            {{ currImgIdx + 1 }} / {{ totalImages }}
                        </div>
                        <a :class="buttonClasses" class="rounded-r-md !text-xl" href="#" role="button"
                            @click.prevent="nextImage()" title="">
                            <i class="fa-solid fa-caret-right"></i>
                        </a>
                    </div>
                </div>


                <div class="flex mr-0.5">
                    <a v-if="currentImgSrc && ocrButton" :class="buttonClasses" class="fa-ocr rounded-md flex items-center"
                        href="#" role="button" @click.prevent="cropAndRecognize">
                        <svg v-if="loadingOcr || loadingQr" class="animate-spin mr-1 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-60" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                            </circle>
                            <path class="opacity-85" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                            </path>
                        </svg>
                        OCR
                    </a>

                    <!-- TEMPORARILY DISABLED UNTIL FUTURE NEED 
                    <a v-if="false" :class="buttonClasses" class="rounded-md" href="#" role="button" @click.prevent="togglePreview"
                        title="Ctrl + ?">
                        <i class="fa-solid fa-eye"></i>
                    </a>
                    <a v-if="false" :class="buttonClasses" class="rounded-md" href="#" role="button"
                        @click.prevent="cropImage" title="Ctrl + ?">
                        <i class="fa-solid fa-scissors"></i>
                    </a>

                    <a v-if="currentImgSrc && qrReader" :class="buttonClasses" class="rounded-md" href="#" role="button"
                        @click.prevent="cropAndReadCode">
                        <i class="fa-solid fa-qrcode"></i>
                    </a>
                    -->
                </div>

            </div>

            <div ref="imageViewerContainerRef"
                class="img-cropper border-[1px] border-stone-400 h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC')]">
                <vue-cropper :class="cropperClasses" v-if="currentImgSrc" ref="cropper" :src="currentImgSrc" preview=".preview"
                    :viewMode="2" :dragMode="'crop'" :modal="true" :highlight="true" :autoCrop="false"
                    :imgStyle="{ display: 'block', maxWidth: '100%' }" @zoom="handleZoom" @cropmove="handleMove"
                    @ready="onCropperReady" />


                <div v-if="!currentImgSrc"
                    class="flex items-center justify-center h-full text-center font-semibold text-xl text-stone-400">
                    <i class="fa-regular fa-image"></i>
                </div>

            </div>

            <hr v-if="showPreview" />

            <div v-if="showPreview" class="w-full flex flex-col items-center">
                <p class="font-bold">Preview</p>
                <div class="preview overflow-hidden w-full h-40"></div>
            </div>

        </div>
    </div>

</template>

<script>
import { createWorker } from 'tesseract.js';
import VueCropper from 'vue-cropperjs';
import 'cropperjs/dist/cropper.css';
import { BrowserMultiFormatReader } from '@zxing/browser';
import jsQR from "jsqr";
import { EventBus } from '../event-bus';


export default {
    components: {
        VueCropper
    },
    data: () => ({
        // For knowing what to load
        currentImgSrc: '',
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
        currRatio: undefined,
        currCropData: undefined,
        lastCropRectInBounds: undefined,

        // Multiple images
        currImgIdx: 0,

        //Other
        showPreview: false,
        qrReader: false,
    }),
    computed: {
        options() { return this.component['ImageViewerCustomize'][0]; },
        cropperClasses() { return this.options['ImageViewerClasses'] || "h-full"; },
        buttonClasses() { return this.options['ImageViewerButtonClasses'] || "border-transparent border-[1px] text-stone-400 font-light text-sm px-2 py-1 hover:border-[1px] hover:border-stone-300 hover:bg-stone-100 hover:cursor-pointer" },
        outputVar() { return this.component["OutputVarImageViewer"] },
        imageUrls() {
            const imgViewerUrl = this.component["ImageViewerURL"];

            if (Array.isArray(imgViewerUrl)) {
                return imgViewerUrl // obj list
                    .map(item => item.ImageViewerURL)
                    .filter(url => typeof url === "string" && url.trim() !== "");
            } else if (typeof imgViewerUrl === "string") {
                return [imgViewerUrl]
            }
            return []
        },
        totalImages() {
            const urls = this.component["ImageViewerURL"]
            const isList = Array.isArray(urls)

            return isList && urls.length > 0 ? urls.length : 0
        },
        componentIdentifier() { return this.options["ImageViewerIdentifier"] || "" },

        // Vars that define if button groups should appear
        enableButtons() {
            //bg-blue-600 text-stone-200 font-light  border-2 text-sm border-stone-800 px-2 py-1 hover:bg-blue-400 hover:cursor-pointer
            if (this.options['Enable Buttons']) {
                return this.options['Enable Buttons'].split("\u0000")
            }
            return []
        },

        // Enable buttons
        zoomButtons() { return (this.enableButtons && this.enableButtons.includes("Zoom In/Out")) || false }, // Zoom buttons
        modeSwitch() { return (this.enableButtons && this.enableButtons.includes("Mode Switch")) || false }, // Arrow keys to move image
        rotateButtons() { return (this.enableButtons && this.enableButtons.includes("Rotate")) || false }, // Rotate buttons
        ocrButton() { return (this.enableButtons && this.enableButtons.includes("OCR")) || false }, // OCR Button   
    },
    watch: {
        imageUrls: function (newImgs) {
            this.updateCropperImage(newImgs)
        },
        currImgIdx: function (newImgIdx) {
            this.updateCropperImage(this.imageUrls)
        }
    },
    props: {
        component: Object
    },
    updated() {
        // Hack to fix resize race that happens with the jscropper component
        setTimeout(() => {
            this.calculateViewerHeight()
        }, 150)
    },
    mounted() {
        this.updateCropperImage(this.imageUrls)
    },
    methods: {
        calculateViewerHeight() {
            const viewerContainer = this.$refs.viewerContainerRef;
            const toolbarContainer = this.$refs.imageViewerToolbar;
            const headerContainer = document.getElementById("header"); // Get the header toolbar
            if (!viewerContainer) { return }
            let viewerContainerHeight = window.getComputedStyle(viewerContainer).height;
            let toolbarHeight = window.getComputedStyle(toolbarContainer).height;
            let headerHeight = window.getComputedStyle(headerContainer).height;


            if (viewerContainerHeight.includes("px") && toolbarHeight.includes("px") && headerHeight.includes("px")) {
                viewerContainerHeight = parseInt(viewerContainerHeight.replace("px", ""), 10);
                toolbarHeight = parseInt(toolbarHeight.replace("px", ""), 10);
                headerHeight = parseInt(headerHeight.replace("px", ""), 10);

                const viewportHeight = window.innerHeight;

                // Convert to vh
                const viewerContainerHeightVH = (viewerContainerHeight / viewportHeight) * 100;
                const toolbarHeightVH = (toolbarHeight / viewportHeight) * 100;
                const headerHeightVH = (headerHeight / viewportHeight) * 100;
                const viewerHeightVH = viewerContainerHeightVH - toolbarHeightVH - headerHeightVH;

                this.$refs.imageViewerContainerRef.style.height = `${viewerHeightVH}vh`;
            }
        },
        updateCropperImage(imageUrls) {
            // by default its an empty list
            if (!imageUrls || (imageUrls && imageUrls.length == 0)) { return }
            const currImg = imageUrls[this.currImgIdx] ? imageUrls[this.currImgIdx] : imageUrls[0]
            const isImgDifferent = currImg != this.currentImgSrc
            this.currentImgSrc = currImg
            if (this.$refs.cropper && isImgDifferent) {
                this.$refs.cropper.replace(currImg);
            }
        },
        togglePreview() {
            this.showPreview = !this.showPreview
            if (this.showPreview) {
                this.$refs.cropper.replace(this.currentImgSrc)
            }
        },
        onCropperReady() {
            this.clearCrop()
            this.zoom(0) //we zoom with 0 to force init some vars
            //this.move(0, -10000)
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

                // Show info notification in case the extracted text is ""
                if (!ocrData.data.text) {
                    cob.ui.notification.showInfo(`OCR could not find text to extract.`);
                }

                console.log("ocr data", this.ocrText, ocrData);
                if (this.outputVar) { this.setOutputVar(this.ocrText) }

                let eventDetails = {
                    senderUID: this._uid,
                    componentIdentifier: this.componentIdentifier,
                    details: { ocrText: this.ocrText, cropData: this.currCropData, confidence: ocrData.data.confidence }
                }
                EventBus.emit("imageviewer-ocr", eventDetails)
            } catch (exce) {
                console.log("Error running OCR: ", exce)
            } finally {
                this.loadingOcr = false
                if (worker) { await worker.terminate() }
            }
        },
        async cropAndReadCode() {
            this.cropImage()
            this.loadingQr = true
            const codeReader = new BrowserMultiFormatReader();
            let first_success = false

            // Uses zxing
            try {
                const result = await codeReader.decodeFromImageUrl(this.currentImgSrc);
                console.log("QR Code Content:", result);
                this.qrText = result.text
                this.setOutputVar(result.text)
                first_success = true
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
                } catch (error) {
                    console.log('Error v2: Could not read QR code with jsqr')
                }
            }
            this.loadingQr = false
        },

        /* MOVEMENT RELATED: MOVE, ZOOM & ROTATE */
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
        moveCropbox(offsetX, offsetY) {
            const cropper = this.$refs.cropper;
            if (!cropper) return;

            let cropperData = this.currCropData || cropper.getData(true);
            if (cropperData.width == 0 || cropperData.height == 0) { return }
            cropperData.x += offsetX
            cropperData.y += offsetY
            this.currCropData = cropperData;
            this.setData(cropperData);
        },
        handleMove(e) {
            const cropper = this.$refs.cropper;
            if (!cropper) return;
            let action = e.detail.action;
            if (action === "move" || action === "zoom") {
                const cropperData = this.currCropData || cropper.getData(true);
                if (this.checkBounds(cropperData) && (cropperData.width > 0 && cropperData.height > 0)) {
                    cropper.initCrop();
                    this.currCropData = cropperData;
                    this.setData(cropperData);
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
            this.currRatio = newRatio

            // Get canvas data to determine the bounds
            const cropperData = this.currCropData ? this.currCropData : cropper.getData(true)
            const canvasData = cropper.getCanvasData();
            let { imgLeft, imgTop, imgRight, imgBottom } = this.convertCanvasToImageSpace(canvasData, newRatio)

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
        nextImage() {
            if (this.currImgIdx + 1 >= this.totalImages - 1) {
                this.currImgIdx = this.totalImages - 1
            } else {
                this.currImgIdx++
            }
            this.clearCrop()
        },
        prevImage() {
            if (this.currImgIdx - 1 <= 0) {
                this.currImgIdx = 0
            } else {
                this.currImgIdx--
            }
            this.clearCrop()
        },
        rotate(deg) {
            const cropper = this.$refs.cropper;
            if (!cropper) return;
            const croppedData = this.currCropData || cropper.getData(true)  // Get previous values

            const imageData = cropper.getImageData();
            const totalAngle = croppedData.rotate + deg;
            const normalizedAngle = (totalAngle % 360 + 360) % 360; // Ensure normalized angle is positive

            const isRotationPositive = deg > 0;

            // Flip width and height
            const rotatedWidth = croppedData.height;
            const rotatedHeight = croppedData.width;

            const imgWidth = croppedData.rotate % 180 === 0 ? imageData.naturalWidth : imageData.naturalHeight;
            const imgHeight = croppedData.rotate % 180 === 0 ? imageData.naturalHeight : imageData.naturalWidth;

            // Calculate offsets from borders
            const left = croppedData.x;
            const top = croppedData.y;
            const right = imgWidth - left - croppedData.width;
            const bottom = imgHeight - top - croppedData.height;

            // Compute new offsets based on angle
            const computeNewOffsets = (angle, isPositive) => {
                const horizontalOffset = isPositive ? bottom : top;
                const verticalOffset = isPositive ? left : right;

                switch (angle) {
                    case 0:
                    case 90:
                    case 180:
                    case 270:
                        return { newLeft: horizontalOffset, newTop: verticalOffset };
                    default:
                        return { newLeft: left, newTop: top }; // Default case (unlikely to be hit)
                }
            };

            const { newLeft, newTop } = computeNewOffsets(normalizedAngle, isRotationPositive);
            let newCropperData = {
                x: newLeft,
                y: newTop,
                width: rotatedWidth,
                height: rotatedHeight,
                rotate: totalAngle
            };

            cropper.rotate(deg);
            this.currCropData = newCropperData;
            if (this.checkBounds(newCropperData)) {
                setTimeout(() => {
                    if (newCropperData.width > 0 && newCropperData.height > 0) {
                        cropper.initCrop()
                        this.setData(newCropperData);
                    }
                }, 20);
            } else {
                cropper.clear();
            }
        },
        // Under frequent re-works
        highlightBox(x, y, w, h, r) {
            const cropper = this.$refs.cropper;
            if (!cropper) return;

            const canvasData = cropper.getCanvasData();
            let { imgLeft, imgTop, imgRight, imgBottom } = this.convertCanvasToImageSpace(canvasData, this.currRatio)

            let rotation = this.currCropData ? this.currCropData.rotate : cropper.getData().rotate
            let newCropperData = {
                x: x,
                y: y,
                width: w,
                height: h,
                rotate: r || rotation
            };

            if (!newCropperData.width || !newCropperData.height || newCropperData.width == 0 || newCropperData.height == 0) {
                return;
            }

            // Place default cropper
            this.cropCrop()

            // "Calculate" dropbox coords - we changed the names to left, right, etc to help with
            // readability
            let { x: cb_left, y: cb_top, width: cb_width, height: cb_height } = newCropperData;
            let cb_right = cb_left + cb_width
            let cb_bottom = cb_top + cb_height

            // Check individual bounds because we will need to know what to use
            // to calculate the offsets
            let left_in_bounds = (imgLeft < cb_left) && (cb_left < imgRight)
            let right_in_bounds = (imgLeft < cb_right) && (cb_right < imgRight)
            let top_in_bounds = (imgTop < cb_top) && (cb_top < imgBottom)
            let bottom_in_bounds = (imgTop < cb_bottom) && (cb_bottom < imgBottom)

            let offsetX = 0
            let offsetY = 0
            // Horizontal bounds
            if (!left_in_bounds && !right_in_bounds) {
                const cropBoxCenterX = cb_left + cb_width / 2;
                const imageCenterX = (imgLeft + imgRight) / 2;
                offsetX = cropBoxCenterX - imageCenterX;
            } else if (!left_in_bounds) {
                offsetX = cb_left - imgLeft;
            } else if (!right_in_bounds) {
                offsetX = cb_right - imgRight;
            }

            // Vertical bounds
            if (!top_in_bounds && !bottom_in_bounds) {
                const cropBoxCenterY = cb_top + cb_height / 2;
                const imageCenterY = (imgTop + imgBottom) / 2;
                offsetY = cropBoxCenterY - imageCenterY;
            } else if (!top_in_bounds) {
                offsetY = cb_top - imgTop;
            } else if (!bottom_in_bounds) {
                offsetY = cb_bottom - imgBottom;
            }

            cropper.move(-offsetX * this.currRatio, -offsetY * this.currRatio);
            this.setData(newCropperData)
            console.log("RV highlight box!")
        },
        // HTML INPUT RELATED
        setImage(e) {
            const file = e.target.files[0];
            if (file.type.indexOf('image/') === -1) {
                alert('Please select an image file');
                return;
            }
            if (typeof FileReader === 'function') {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.currentImgSrc = event.target.result;
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
        // DASHBOARD RELATED
        setOutputVar(outputText) {
            this.$set(this.component.vars, this.outputVar, outputText)
        },

        /* BASIC CROPPER OPS */
        setCropBoxData(left, top, width, height) {
            const cropper = this.$refs.cropper
            if (!cropper) { return }
            cropper.setCropBoxData(left, top, width, height);
        },
        setData(newData) {
            const cropper = this.$refs.cropper
            if (!cropper) { return }
            let new_data = {
                x: newData.x, y: newData.y, width: newData.width, height: newData.height,
                scaleX: 1, scaleY: 1, rotate: newData.rotate ? newData.rotate : 0
            }
            this.currCropData = new_data
            cropper.setData(new_data);
        },
        setDragMode(dragMode) {
            const cropper = this.$refs.cropper
            if (!cropper) { return }
            cropper.setDragMode(dragMode)
        },
        cropImage() {
            const cropper = this.$refs.cropper
            if (!cropper) { return }
            this.cropImg = cropper.getCroppedCanvas().toDataURL('image/jpeg');
        },
        zoom(percent) {
            const cropper = this.$refs.cropper
            if (!cropper) return;
            cropper.relativeZoom(percent);
        },
        enableCropper() {
            const cropper = this.$refs.cropper
            if (!cropper) return;
            cropper.enable();
        },
        disableCropper() {
            const cropper = this.$refs.cropper
            if (!cropper) return;
            cropper.disable();
        },
        cropCrop() {
            const cropper = this.$refs.cropper
            if (!cropper) return;
            cropper.initCrop();
        },
        clearCrop() {
            this.currCropData = undefined
            const cropper = this.$refs.cropper
            if (!cropper) return;
            cropper.clear();
        },
        reset() {
            this.initialRatio = null
            const cropper = this.$refs.cropper
            if (!cropper) { return }
            cropper.reset();
        },

        // FOR DEBUG
        getCanvasData() {
            this.canvasData = JSON.stringify(this.$refs.cropper.getCanvasData())
        },
        getCropBoxData() {
            this.cropBoxData = JSON.stringify(this.$refs.cropper.getCropBoxData(), null, 4);
        },
        getData() {
            this.viewData = JSON.stringify(this.$refs.cropper.getData(), null, 4);
        },
        setCropBoxDataText() {
            if (!this.cropBoxData) return;
            this.$refs.cropper.setCropBoxData(JSON.parse(this.cropBoxData));
        },
        setDataText() {
            if (!this.viewData) return;
            this.$refs.cropper.setData(JSON.parse(this.viewData));
            this.currCropData = JSON.parse(this.viewData)
        },
    },
}
</script>