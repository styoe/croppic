/*
 * CROP
 * dependancy: jQuery
 * author: Ognjen "Zmaj DÅ¾edaj" BoÅ¾iÄkoviÄ‡
 * 
 * Modification: Martin Lingstuyl
 * Information:
 * 1) On initialising it preloads the image thats on the server. If this is an uncropped image it will load the cropper instead of the uploader.
 * 2) If FormData is inaccessible it will use an iframe as fallback
 * 3) Added initialzoom option and other necessary options
 * 4) I also removed the reset button, as it had no function in my script. People just have to crop, after that, they can upload again. 
 * 5) Lastly: my asp.net web api doesn't return parseable json, but an array, so I changed the way the response is read after ajax calls.
 */

(function (window, document) {

    Croppic = function (id, options) {

        var that = this;
        that.id = id;
        that.obj = $('#' + id);
        that.outputDiv = that.obj;

        // DEFAULT OPTIONS
        that.options = {
            getUrl: '',
            uploadUrl: '',
            uploadFallbackUrl: '',
            uploadData: {},
            cropUrl: '',
            cropData: {},
            outputUrlId: '',
            //styles
            imgEyecandy: true,
            imgEyecandyOpacity: 0.2,
            zoomFactor: 10,
            initialZoom: 40,
            doubleZoomControls: true,
            modal: false,
            customUploadButtonId: '',
            loaderHtml: '',
            //callbacks
            onBeforeImgUpload: null,
            onAfterImgUpload: null,
            onImgDrag: null,
            onImgZoom: null,
            onBeforeImgCrop: null,
            onAfterImgCrop: null
        };

        // OVERWRITE DEFAULT OPTIONS
        for (i in options) that.options[i] = options[i];

        // INIT THE WHOLE DAMN THING!!!
        that.init(true);

    };

    Croppic.prototype = {
        id: '',
        imgInitW: 0,
        imgInitH: 0,
        imgW: 0,
        imgH: 0,
        objW: 0,
        objH: 0,
        windowW: 0,
        windowH: $(window).height(),
        obj: {},
        outputDiv: {},
        outputUrlObj: {},
        img: {},
        defaultImg: {},
        croppedImg: {},
        imgEyecandy: {},
        form: {},
        iframeform: {},
        iframeobj: {},
        cropControlsUpload: {},
        cropControlsCrop: {},
        cropControlZoomMuchIn: {},
        cropControlZoomMuchOut: {},
        cropControlZoomIn: {},
        cropControlZoomOut: {},
        cropControlCrop: {},
        cropControlReset: {},
        cropControlRemoveCroppedImage: {},
        modal: {},
        loader: {},

        preloadexisting: function (preloadexisting, callback) {
            var that = this;

            if (preloadexisting == true) {
                $.ajax({
                    url: that.options.getUrl,
                    type: 'GET'
                }).always(function (response) {
                    
                    if (response[0] == 'Success') {
                        $("<img src='" + response[1] + "' width='" + response[2] + "' height='" + response[3] + "' class='" + response[4] + "' alt=''/>").appendTo("#croppic");
                    }                        
                                        
                    if (typeof callback == "function") { callback(); }
                });
            } else {
                if (typeof callback == "function") { callback(); }
            }
        },

        init: function (preloadexisting) {
            var that = this;

            that.preloadexisting(preloadexisting, function () {
                				                            
                that.objW = that.obj.width();
                that.objH = that.obj.height();

                if ($.isEmptyObject(that.defaultImg)) { that.defaultImg = that.obj.find('img'); }

                //If on pageload it contains an image with tocrop status, it loads the cropper instead of the uploader
                if (that.defaultImg.hasClass("tocrop")) {
                    that.imgInitW = that.imgW = parseFloat(that.defaultImg.attr("width"));
                    that.imgInitH = that.imgH = parseFloat(that.defaultImg.attr("height"));

                    if (that.options.modal) { that.createModal(); }

                    that.obj.append('<img src="' + that.defaultImg.attr("src") + '">');
                    that.defaultImg.remove();
                    that.defaultImg = {};

                    that.initCropper();

                } else {
                    that.createImgUploadControls();
                    that.bindImgUploadControl();
                }
            });
        },
        createImgUploadControls: function () {
            var that = this;

            var cropControlUpload = '';
            if (that.options.customUploadButtonId === '') { cropControlUpload = '<i class="cropControlUpload"></i>'; }
            var cropControlRemoveCroppedImage = '<i class="cropControlRemoveCroppedImage"></i>';

            if ($.isEmptyObject(that.croppedImg)) { cropControlRemoveCroppedImage = ''; }

            var html = '<div class="cropControls cropControlsUpload"> ' + cropControlUpload  + ' </div>';
            that.outputDiv.append(html);

            that.cropControlsUpload = that.outputDiv.find('.cropControlsUpload');

            if (that.options.customUploadButtonId === '') { that.imgUploadControl = that.outputDiv.find('.cropControlUpload'); }
            else { that.imgUploadControl = $('#' + that.options.customUploadButtonId); that.imgUploadControl.show(); }


        },
        bindImgUploadControl: function () {

            var that = this;

            // CREATE UPLOAD IMG FORM
            var formHtml = '<form class="' + that.id + '_imgUploadForm" style="display: none; visibility: hidden;">  <input type="file" name="img" id="' + that.id + '_imgUploadField">  </form>';
            that.outputDiv.append(formHtml);
            that.form = that.outputDiv.find('.' + that.id + '_imgUploadForm');

            // CREATE FALLBACK IE9 IFRAME
            var fileUploadId = that.CreateFallbackIframe();

            that.imgUploadControl.off('click');
            that.imgUploadControl.on('click', function () {
                if (fileUploadId === "") {
                    that.form.find('input[type="file"]').trigger('click');
                } else {
                    //Trigger iframe file input click, otherwise access restriction error
                    that.iframeform.find('input[type="file"]').trigger('click');
                }
            });

            that.form.find('input[type="file"]').change(function () {

                if (that.options.onBeforeImgUpload) that.options.onBeforeImgUpload.call(that);

                that.showLoader();
                that.imgUploadControl.hide();
                
                var formData = new FormData(that.form[0]);

                for (var key in that.options.uploadData) {
                    if (that.options.uploadData.hasOwnProperty(key)) {
                        formData.append(key, that.options.uploadData[key]);
                    }
                }

                $.ajax({
                    url: that.options.uploadUrl,
                    data: formData,
                    context: document.body,
                    cache: false,
                    contentType: false,
                    processData: false,
                    type: 'POST'
                }).always(function (data) {

                    that.afterUpload(data);

                });

            });

        },
        afterUpload: function (response) {
            var that = this;

            if (response[0] == 'Success') {

                that.imgInitW = that.imgW = response[2];
                that.imgInitH = that.imgH = response[3];

                if (that.options.modal) { that.createModal(); }
                if (!$.isEmptyObject(that.croppedImg)) { that.croppedImg.remove(); }

                that.imgUrl = response[1];

                that.obj.append('<img src="' + response[1] + '">');
                that.initCropper();

                that.hideLoader();
                                
                if (that.options.onAfterImgUpload) that.options.onAfterImgUpload.call(that);

            }

            if (response[0] == 'Error') {
                that.obj.append('<p style="width:100%; height:100%; text-align:center; line-height:' + that.objH + 'px;">' + response[1] + '</p>');
                that.hideLoader();
                setTimeout(function () { that.reset(); }, 2000)
            }
        },
        createModal: function () {
            var that = this;

            var marginTop = that.windowH / 2 - that.objH / 2;
            var modalHTML = '<div id="croppicModal">' + '<div id="croppicModalObj" style="width:' + that.objW + 'px; height:' + that.objH + 'px; margin:0 auto; margin-top:' + marginTop + 'px; position: relative;"> </div>' + '</div>';

            $('body').append(modalHTML);

            that.modal = $('#croppicModal');

            that.obj = $('#croppicModalObj');

        },
        destroyModal: function () {
            var that = this;

            that.obj = that.outputDiv;
            that.modal.remove();
            that.modal = {};
        },
        initCropper: function () {
            var that = this;

            /*SET UP SOME VARS*/
            that.img = that.obj.find('img');
            that.img.wrap('<div class="cropImgWrapper" style="overflow:hidden; z-index:1; position:absolute; width:' + that.objW + 'px; height:' + that.objH + 'px;"></div>');

            /*INIT DRAGGING*/
            that.createCropControls();

            if (that.options.imgEyecandy) { that.createEyecandy(); }
            that.initDrag();
            that.initialScaleImg();
        },
        createEyecandy: function () {
            var that = this;

            that.imgEyecandy = that.img.clone();
            that.imgEyecandy.css({ 'z-index': '0', 'opacity': that.options.imgEyecandyOpacity }).appendTo(that.obj);
        },
        destroyEyecandy: function () {
            var that = this;
            that.imgEyecandy.remove();
        },
        initialScaleImg: function () {
            var that = this;
            that.zoom(-that.imgInitW);
            that.zoom(that.options.initialZoom);

            // initial center image

            that.img.css({ 'left': -(that.imgW - that.objW) / 2, 'top': -(that.imgH - that.objH) / 2, 'position': 'relative' });
            if (that.options.imgEyecandy) { that.imgEyecandy.css({ 'left': -(that.imgW - that.objW) / 2, 'top': -(that.imgH - that.objH) / 2, 'position': 'relative' }); }

        },

        createCropControls: function () {
            var that = this;

            // CREATE CONTROLS
            var cropControlZoomMuchIn = '<i class="cropControlZoomMuchIn"></i>';
            var cropControlZoomIn = '<i class="cropControlZoomIn"></i>';
            var cropControlZoomOut = '<i class="cropControlZoomOut"></i>';
            var cropControlZoomMuchOut = '<i class="cropControlZoomMuchOut"></i>';
            var cropControlCrop = '<i class="cropControlCrop"></i>';            

            var html;

            if (that.options.doubleZoomControls) { html = '<div class="cropControls cropControlsCrop">' + cropControlZoomMuchIn + cropControlZoomIn + cropControlZoomOut + cropControlZoomMuchOut + cropControlCrop /*+ cropControlReset*/ + '</div>'; }
            else { html = '<div class="cropControls cropControlsCrop">' + cropControlZoomIn + cropControlZoomOut + cropControlCrop  + '</div>'; }

            that.obj.append(html);

            that.cropControlsCrop = that.obj.find('.cropControlsCrop');

            // CACHE AND BIND CONTROLS
            if (that.options.doubleZoomControls) {
                that.cropControlZoomMuchIn = that.cropControlsCrop.find('.cropControlZoomMuchIn');
                that.cropControlZoomMuchIn.on('click', function () { that.zoom(that.options.zoomFactor * 10); });

                that.cropControlZoomMuchOut = that.cropControlsCrop.find('.cropControlZoomMuchOut');
                that.cropControlZoomMuchOut.on('click', function () { that.zoom(-that.options.zoomFactor * 10); });
            }

            that.cropControlZoomIn = that.cropControlsCrop.find('.cropControlZoomIn');
            that.cropControlZoomIn.on('click', function () { that.zoom(that.options.zoomFactor); });

            that.cropControlZoomOut = that.cropControlsCrop.find('.cropControlZoomOut');
            that.cropControlZoomOut.on('click', function () { that.zoom(-that.options.zoomFactor); });

            that.cropControlCrop = that.cropControlsCrop.find('.cropControlCrop');
            that.cropControlCrop.on('click', function () { that.crop(); });
        },
        initDrag: function () {
            var that = this;

            that.img.on("mousedown", function (e) {

                e.preventDefault(); // disable selection

                var z_idx = that.img.css('z-index'),
                drg_h = that.img.outerHeight(),
                drg_w = that.img.outerWidth(),
                pos_y = that.img.offset().top + drg_h - e.pageY,
                pos_x = that.img.offset().left + drg_w - e.pageX;

                that.img.css('z-index', 1000).on("mousemove", function (e) {

                    var imgTop = e.pageY + pos_y - drg_h;
                    var imgLeft = e.pageX + pos_x - drg_w;

                    that.img.offset({
                        top: imgTop,
                        left: imgLeft
                    }).on("mouseup", function () {
                        $(this).removeClass('draggable').css('z-index', z_idx);
                    });

                    if (that.options.imgEyecandy) { that.imgEyecandy.offset({ top: imgTop, left: imgLeft }); }

                    if (parseInt(that.img.css('top')) > 0) { that.img.css('top', 0); if (that.options.imgEyecandy) { that.imgEyecandy.css('top', 0); } }
                    var maxTop = -(that.imgH - that.objH); if (parseInt(that.img.css('top')) < maxTop) { that.img.css('top', maxTop); if (that.options.imgEyecandy) { that.imgEyecandy.css('top', maxTop); } }

                    if (parseInt(that.img.css('left')) > 0) { that.img.css('left', 0); if (that.options.imgEyecandy) { that.imgEyecandy.css('left', 0); } }
                    var maxLeft = -(that.imgW - that.objW); if (parseInt(that.img.css('left')) < maxLeft) { that.img.css('left', maxLeft); if (that.options.imgEyecandy) { that.imgEyecandy.css('left', maxLeft); } }

                    if (that.options.onImgDrag) that.options.onImgDrag.call(that);

                });

            }).on("mouseup", function () {
                that.img.off("mousemove");
            }).on("mouseout", function () {
                that.img.off("mousemove");
            });

        },
        zoom: function (x) {
            var that = this;
            var ratio = that.imgW / that.imgH;
            var newWidth = that.imgW + x;
            var newHeight = newWidth / ratio;
            var doPositioning = true;

            if (newWidth < that.objW || newHeight < that.objH) {

                if (newWidth - that.objW < newHeight - that.objH) {
                    newWidth = that.objW;
                    newHeight = newWidth / ratio;
                } else {
                    newHeight = that.objH;
                    newWidth = ratio * newHeight;
                }

                doPositioning = false;

            }

            if (newWidth > that.imgInitW || newHeight > that.imgInitH) {

                if (newWidth - that.imgInitW < newHeight - that.imgInitH) {
                    newWidth = that.imgInitW;
                    newHeight = newWidth / ratio;
                } else {
                    newHeight = that.imgInitH;
                    newWidth = ratio * newHeight;
                }

                doPositioning = false;

            }

            that.imgW = newWidth;
            that.img.width(newWidth);

            that.imgH = newHeight;
            that.img.height(newHeight);

            var newTop = parseInt(that.img.css('top')) - x / 2;
            var newLeft = parseInt(that.img.css('left')) - x / 2;

            if (newTop > 0) { newTop = 0; }
            if (newLeft > 0) { newLeft = 0; }

            var maxTop = -(newHeight - that.objH); if (newTop < maxTop) { newTop = maxTop; }
            var maxLeft = -(newWidth - that.objW); if (newLeft < maxLeft) { newLeft = maxLeft; }

            if (doPositioning) {
                that.img.css({ 'top': newTop, 'left': newLeft });
            }

            if (that.options.imgEyecandy) {
                that.imgEyecandy.width(newWidth);
                that.imgEyecandy.height(newHeight);
                if (doPositioning) {
                    that.imgEyecandy.css({ 'top': newTop, 'left': newLeft });
                }
            }

            if (that.options.onImgZoom) that.options.onImgZoom.call(that);

        },
        crop: function () {
            var that = this;

            if (that.options.onBeforeImgCrop) that.options.onBeforeImgCrop.call(that);

            that.cropControlsCrop.hide();
            that.showLoader();

            var cropData = {
                imgUrl: that.imgUrl,
                imgInitW: that.imgInitW,
                imgInitH: that.imgInitH,
                imgW: that.imgW,
                imgH: that.imgH,
                imgY1: Math.abs(parseInt(that.img.css('top'))),
                imgX1: Math.abs(parseInt(that.img.css('left'))),
                cropH: that.objH,
                cropW: that.objW
            };
                     
            var Querystring = "";
            for (var key in cropData) {
                if (cropData.hasOwnProperty(key)) {
                    Querystring += "&" + key + "=" + cropData[key];
                }
            }

            for (var key in that.options.cropData) {
                if (that.options.cropData.hasOwnProperty(key)) {
                    Querystring += "&" + key + "=" + that.options.cropData[key];                    
                }
            }

            $.ajax({
                url: that.options.cropUrl + "?" + Querystring.substring(1),                
                context: document.body,
                cache: false,
                contentType: false,
                processData: false,
                type: 'GET'                
            }).always(function (data) {

                that.afterCrop(data);

            });
        },
        afterCrop: function (response) {
            var that = this;
            
            if (response[0] == 'Success') {

                that.imgEyecandy.hide();

                that.destroy();

                that.obj.append('<img class="croppedImg" src="' + response[1] + '">');
                if (that.options.outputUrlId !== '') { $('#' + that.options.outputUrlId).val(response[1]); }

                that.croppedImg = that.obj.find('.croppedImg');

                that.init(false);

                that.hideLoader();

            }
            if (response[0] == 'Error') {
                that.obj.append('<p style="width:100%; height:100%;>' + response[1] + '</p>">');
            }

            if (that.options.onAfterImgCrop) that.options.onAfterImgCrop.call(that);
        },
        showLoader: function () {
            var that = this;

            that.obj.append(that.options.loaderHtml);
            that.loader = that.obj.find('.loader');

        },
        hideLoader: function () {
            var that = this;
            that.loader.remove();
        },
        reset: function () {
            var that = this;
            that.destroy();

            that.init(false);

            if (!$.isEmptyObject(that.croppedImg)) {
                that.obj.append(that.croppedImg);
                if (that.options.outputUrlId !== '') { $('#' + that.options.outputUrlId).val(that.croppedImg.attr('url')); }
            }

        },
        destroy: function () {
            var that = this;
            if (that.options.modal && !$.isEmptyObject(that.modal)) { that.destroyModal(); }
            if (that.options.imgEyecandy && !$.isEmptyObject(that.imgEyecandy)) { that.destroyEyecandy(); }
            if (!$.isEmptyObject(that.cropControlsUpload)) { that.cropControlsUpload.remove(); }
            if (!$.isEmptyObject(that.cropControlsCrop)) { that.cropControlsCrop.remove(); }
            if (!$.isEmptyObject(that.loader)) { that.loader.remove(); }
            if (!$.isEmptyObject(that.form)) { that.form.remove(); }
            that.obj.html('');
        },
        isAjaxUploadSupported: function () {
            var input = document.createElement("input");
            input.type = "file";

            return (
                "multiple" in input &&
                    typeof File != "undefined" &&
                    typeof FormData != "undefined" &&
                    typeof (new XMLHttpRequest()).upload != "undefined");
        },
        CreateFallbackIframe: function () {
            var that = this;            
            
            //Check if IE fallfack is necessary
            if (!that.isAjaxUploadSupported()) { 

                //Create iFrame or load it (if its on the page)
                if (jQuery.isEmptyObject(that.iframeobj)) {
                    var iframe = document.createElement("iframe");
                    iframe.setAttribute("id", that.id + "_upload_iframe");
                    iframe.setAttribute("name", that.id + "_upload_iframe");
                    iframe.setAttribute("width", "0");
                    iframe.setAttribute("height", "0");
                    iframe.setAttribute("border", "0");
                    iframe.setAttribute("src", "javascript:false;");
                    iframe.style.display = "none";
                    document.body.appendChild(iframe);
                } else {
                    iframe = that.iframeobj[0];
                }

                //Create content for iFrame
                var myContent = '<!DOCTYPE html>'
                                + '<html><head><title>Uploading File</title></head>'
                                + '<body>'
                                + '<form '
                                + 'class="' + that.id + '_upload_iframe_form" '                               
                                + 'name="' + that.id + '_upload_iframe_form" '
                                + 'action="' + that.options.uploadFallbackUrl + '" method="post" '
                                + 'enctype="multipart/form-data" encoding="multipart/form-data" style="display:none;">'
                                + $("#" + that.id + '_imgUploadField')[0].outerHTML
                                + '</form></body></html>';

                //Add content to iFrame
                iframe.contentWindow.document.open('text/htmlreplace');
                iframe.contentWindow.document.write(myContent);
                iframe.contentWindow.document.close();

                //Create iFrame and iFrame form objects
                that.iframeobj = $("#" + that.id + "_upload_iframe");                
                that.iframeform = that.iframeobj.contents().find("html").find("." + that.id + "_upload_iframe_form");
                
                //Create event listeners for starting fallback upload                
                // onchange for IE9, onchange for < IE8
                that.iframeform.on("change", "input", function () {
                    that.SubmitFallbackIframe(that);
                });
                that.iframeform.find("input")[0].attachEvent("onchange", function () {
                    that.SubmitFallbackIframe(that);
                });
                
                //Create event listener for form                
                var eventHandlermyFile = function () {
                    if (iframe.detachEvent)
                        iframe.detachEvent("onload", eventHandlermyFile);
                    else
                        iframe.removeEventListener("load", eventHandlermyFile, false);

                    var response = that.getIframeContentJSON(iframe);

                    //Only load modal once (events load it twice otherwise)
                    if (jQuery.isEmptyObject(that.modal)) {
                        
                        //Start cropper
                        that.afterUpload(response);
                    }
                }

                if (iframe.addEventListener)
                    iframe.addEventListener("load", eventHandlermyFile, true);
                if (iframe.attachEvent)
                    iframe.attachEvent("onload", eventHandlermyFile);

                //Return id of file field for use on 'upload-button' click event
                return "#" + that.id + '_imgUploadField';
                
            } else {
                return "";
            }

        },
        SubmitFallbackIframe: function (that) {           
            that.showLoader();                                    
            that.iframeform[0].submit();
        },
        getIframeContentJSON: function (iframe) {
            //IE may throw an "access is denied" error when attempting to access contentDocument on the iframe in some cases
            try {                
                // iframe.contentWindow.document - for IE<7
                var doc = iframe.contentDocument ? iframe.contentDocument : iframe.contentWindow.document,
	                response;

                var innerHTML = doc.body.innerHTML;
                //plain text response may be wrapped in <pre> tag
                if (innerHTML.slice(0, 5).toLowerCase() == "<pre>" && innerHTML.slice(-6).toLowerCase() == "</pre>") {
                    innerHTML = doc.body.firstChild.firstChild.nodeValue;
                }
                response = jQuery.parseJSON(innerHTML);
            } catch (err) {
                response = { success: false };
            }

            return response;
        }
    };
})(window, document);
