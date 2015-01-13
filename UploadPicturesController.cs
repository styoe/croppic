using CustomClasses;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using System.Web.Security;

using System.Threading.Tasks;
using System.Drawing;
using System.Drawing.Imaging;

//Dependencies:: Install with nuget.  
using ImageProcessor;   //PM > Install-Package ImageProcessor
using Newtonsoft.Json;  //PM> Install-Package Newtonsoft.Json

namespace Croppic.Controller
{
    public class UploadingPicturesController : ApiController
    {        
        /// <summary>
        /// This method finds the file in the database or preconfigured path.
        /// Add your own mechanism to load a database record and determine the path
        /// </summary>
        /// <returns></returns>
        #region GET FILE
        [HttpGet]
        public IEnumerable<string> GetFile()
        {            
            //Get File from preconfigured location
            //!! Load for example from database
            string path = @"c:\path\to\preconfigured\location";
            
            var directory = new DirectoryInfo(path);

            //Try loading the _uncropped file
            var CroppedFile = directory.GetFiles().Where(it => it.FullName.Contains("_uncropped"))
                         .OrderByDescending(it => it.LastWriteTime)
                         .FirstOrDefault();

            //If no _uncropped, load _crop
            CroppedFile = (CroppedFile != null) ? CroppedFile : directory.GetFiles().Where(it => it.FullName.Contains("_crop"))
                         .OrderByDescending(it => it.LastWriteTime)
                         .FirstOrDefault();

            //Now load the picture url en return relative
            if (CroppedFile != null)
            {
                using (var img = Image.FromFile(CroppedFile.FullName))
                {
                    //Add the width, height, url, and tocrop class (to use with croppic.js)
                    return new[] { "Success", string.Format("/path/to/preconfiguredfile/{0}?v={1}", CroppedFile.Name, CustomFunctions.GetTimeStamp()), img.Width.ToString(), img.Height.ToString(), CroppedFile.Name.Contains("_uncropped") ? "tocrop" : "" };
                }
            }


            return new[] { "Error", "No picture found" };
        }
        #endregion

        /// <summary>
        /// This method Asynchronously uploads the file through ajax.         
        /// </summary>
        /// <returns></returns>
        #region ASYNC UPLOAD FILE (AJAX UPLOAD ENABLED BROWSERS: FIREFOX, IE10+, CHROME, ETC)
        [HttpPost]
        public async Task<List<string>> UploadFile()
        {
            if (!Request.Content.IsMimeMultipartContent("form-data"))
            {
                //HttpResponseMessage response = Request.CreateResponse(HttpStatusCode.BadRequest, "Invalid Request!");
                //throw new HttpResponseException(response);

                List<string> emessages = new List<string>();
                emessages.Add("Error");
                emessages.Add("Er is geen correct bestandsformaat geupload");
                return emessages;
            }

            //Read or Create folder in preconfigured location            
            string path = @"c:\path\to\preconfigured\location";            
            if (!Directory.Exists(path)) Directory.CreateDirectory(path);

            // Delete all files without _crop (ti keep folders clean)
            var directory = new DirectoryInfo(path);
            foreach (var file in directory.GetFiles().Where(it => !it.FullName.Contains("_crop")))
            {
                file.Delete();
            }

            // Create a stream provider for setting up output streams
            var streamProvider = new CustomMultipartFormDataStreamProvider(path);

            // Read upload form and save it to folder
            await Request.Content.ReadAsMultipartAsync(streamProvider);

            // Resize and/or rename file. And add Url + size to Return message
            List<string> messages = new List<string>();
            messages.Add("Success");
            foreach (var file in streamProvider.FileData)
            {
                FileInfo fi = ResizeFileInfo(file.LocalFileName, path);

                //Relative path uses filename + _uncropped addition. Splits on '.' to remove extension.
                messages.Add(string.Format("/path/to/preconfigured/location/{0}_uncropped{1}?v={2}", fi.Name.Split('.')[0], fi.Extension.ToLower(), CustomFunctions.GetTimeStamp()));
                using (var img = Image.FromFile(fi.FullName))
                {
                    messages.Add(img.Width.ToString());
                    messages.Add(img.Height.ToString());
                }
            }
            return messages;
        }
        #endregion

        /// <summary>
        /// This method uploads the file through a regular form submit. Works for IE8, 9 (didnt test IE7)
        /// This actually is almost the same code as above. 
        /// </summary>
        #region UPLOAD FILE THROUGH IFRAME
        [HttpPost]
        public async Task<HttpResponseMessage> UploadFileIframe()
        {
            var response = Request.CreateResponse(HttpStatusCode.OK);

            if (!Request.Content.IsMimeMultipartContent("form-data"))
            {
                List<string> emessages = new List<string>();
                emessages.Add("Error");
                emessages.Add("Er is geen correct bestandsformaat geupload");

                response.Content = new StringContent(JsonConvert.SerializeObject(emessages), System.Text.Encoding.UTF8, "text/plain");
                return response;

            }

            //Read or Create folder            
            string path = @"c:\path\to\preconfigured\location";
            if (!Directory.Exists(path)) Directory.CreateDirectory(path);

            // Delete all files without _crop (ti keep folders clean)
            var directory = new DirectoryInfo(path);
            foreach (var file in directory.GetFiles().Where(it => !it.FullName.Contains("_crop")))
            {
                file.Delete();
            }

            // Create a stream provider for setting up output streams
            var streamProvider = new CustomMultipartFormDataStreamProvider(path);

            // Read upload form and save it to folder
            var result = await Request.Content.ReadAsMultipartAsync(streamProvider);

            // Resize and/or rename file. And add Url + size to Return message
            List<string> messages = new List<string>();

            if (result.FileData.Count > 0)
            {
                messages.Add("Success");
                foreach (var file in streamProvider.FileData)
                {
                    FileInfo fi = ResizeFileInfo(file.LocalFileName, path);
                    messages.Add(string.Format("/path/to/preconfigured/location/{0}_uncropped{1}?v={2}", fi.Name.Split('.')[0], fi.Extension.ToLower(), CustomFunctions.GetTimeStamp()));
                    using (var img = Image.FromFile(fi.FullName))
                    {
                        messages.Add(img.Width.ToString());
                        messages.Add(img.Height.ToString());
                    }
                }
            }
            else
            {
                List<string> emessages = new List<string>();
                emessages.Add("Error");
                emessages.Add("Er is geen bestand geupload");

                response.Content = new StringContent(JsonConvert.SerializeObject(emessages), System.Text.Encoding.UTF8, "text/plain");
                return response;
            }


            // The json is returned serialised with a text/plain command, otherwise IE tries downloading the file after submitting.
            response.Content = new StringContent(JsonConvert.SerializeObject(messages), System.Text.Encoding.UTF8, "text/plain");
            return response;
        }
        #endregion

        /// <summary>
        /// Resizes file after uploading
        /// </summary>        
        #region RESIZE FILE
        private FileInfo ResizeFileInfo(string path, string RootPath)
        {
            //Load fileinfo
            FileInfo oldfile = new FileInfo(path);

            // Check if file is too large                            
            bool TooLarge = false;
            int w = 0;
            int h = 0;
            double Proportions = 0;
            using (var img = Image.FromFile(path))
            {
                if (img.Width > img.Height && img.Width > 600) TooLarge = true;
                if (img.Width < img.Height && img.Height > 600) TooLarge = true;
                Proportions = Convert.ToDouble(img.Width) / Convert.ToDouble(img.Height);
                w = img.Width;
                h = img.Height;
            }


            // Read a file and resize it.
            byte[] photoBytes = System.IO.File.ReadAllBytes(path);
            int quality = 70;
            ImageFormat format = ImageFormat.Jpeg;

            //Calculate new size (maximum size 600)
            if (TooLarge)
            {
                if (Proportions > 0) //Width > Height
                {
                    h = Convert.ToInt16(Math.Round(600 / Proportions, 0));
                    w = 600;
                }
                else //Height > Width
                {
                    h = 600;
                    w = Convert.ToInt16(Math.Round(600 * Proportions, 0));
                }
            }
            Size size = new Size(w, h);

            using (MemoryStream inStream = new MemoryStream(photoBytes))
            {
                using (MemoryStream outStream = new MemoryStream())
                {
                    // Initialize the ImageFactory using the overload to preserve EXIF metadata.
                    using (ImageFactory imageFactory = new ImageFactory(preserveExifData: true))
                    {
                        // Load, resize, set the format and quality and save an image.
                        if (!TooLarge)
                            imageFactory.Load(inStream)
                                        .Format(format)
                                        .Quality(quality)
                                        .Save(outStream);
                        else
                            imageFactory.Load(inStream)
                                        .Resize(size)
                                        .Format(format)
                                        .Quality(quality)
                                        .Save(outStream);
                    }

                    // Save file
                    string FilePath = RootPath + oldfile.Name.Split('.')[0] + "_uncropped." + format.ToString().ToLower();
                    using (FileStream fs = new FileStream(FilePath, FileMode.Create, FileAccess.ReadWrite))
                    {
                        outStream.WriteTo(fs);
                    }

                    //Delete old (bigger) file                    
                    oldfile.Delete();

                    //return fileinfo object
                    return new FileInfo(FilePath);
                }

            }
        }
        #endregion

        /// <summary>
        /// Called to by /Umbraco/API/UploadingPictures/CropFile
        /// </summary>
        #region CROP FILE
        [HttpGet]
        public IEnumerable<string> CropFile(string imgUrl = "", string imgInitW = "0", string imgInitH = "0", string imgW = "0", string imgH = "0", string imgY1 = "0", string imgX1 = "0", string cropH = "0", string cropW = "0")
        {
            //Get File without _crop
            string path = @"c:\path\to\preconfigured\location";            

            var directory = new DirectoryInfo(path);
            var FileWithoutCrop = directory.GetFiles().Where(it => !it.FullName.Contains("_crop"))
                         .OrderByDescending(it => it.LastWriteTime)
                         .First();

            int x = 0;
            int y = 0;
            int w = 0;
            int h = 0;
            int cw = 0;
            int ch = 0;
            int.TryParse(imgX1.Split('.')[0], out x);
            int.TryParse(imgY1.Split('.')[0], out y);
            int.TryParse(imgW.Split('.')[0], out w);
            int.TryParse(imgH.Split('.')[0], out h);
            int.TryParse(cropW.Split('.')[0], out cw);
            int.TryParse(cropH.Split('.')[0], out ch);

            if (!(w > 0 && h > 0 && cw > 0 && ch > 0))
            {
                return new[] { "Error", "Cropsize error" };
            }
            else
            {
                // Read a file and resize it.
                byte[] photoBytes = System.IO.File.ReadAllBytes(FileWithoutCrop.FullName);
                int quality = 70;
                ImageFormat format = ImageFormat.Jpeg;
                Size size = new Size(w, h);
                Rectangle crop = new Rectangle(x, y, cw, ch);

                using (MemoryStream inStream = new MemoryStream(photoBytes))
                {
                    using (MemoryStream outStream = new MemoryStream())
                    {
                        // Initialize the ImageFactory using the overload to preserve EXIF metadata.
                        using (ImageFactory imageFactory = new ImageFactory(preserveExifData: true))
                        {
                            // Load, resize, set the format and quality and save an image.
                            imageFactory.Load(inStream)
                                        .Resize(size)
                                        .Crop(crop)
                                        .Format(format)
                                        .Quality(quality)
                                        .Save(outStream);
                        }

                        // Save file
                        string FilePath = String.Format(@"{0}\{1}_crop.{2}", path, FileWithoutCrop.Name.Split('.')[0], format.ToString().ToLower());
                        string RelativePath = String.Format("/path/to/preconfigured/location/{0}_crop.{1}?v={2}", FileWithoutCrop.Name.Split('.')[0], format.ToString().ToLower(), CustomFunctions.GetTimeStamp());
                        using (FileStream fs = new FileStream(FilePath.ToLower(), FileMode.Create, FileAccess.ReadWrite))
                        {
                            outStream.WriteTo(fs);
                        }

                        //Rename file from _uncropped to clean filename
                        System.IO.File.Copy(FileWithoutCrop.FullName, FileWithoutCrop.FullName.Replace("_uncropped", ""));
                        System.IO.File.Delete(FileWithoutCrop.FullName);

                        //Save to path to some database
                        //Implement for yourself where you want to save the actual image to.
                        //I used specific memberfolders as location and saved the crop url to a member table in the database. (from which it is loaded with getfile)
                        

                        //return path
                        return new[] { "Success", RelativePath };
                    }
                }
            }
        }
        #endregion

    }

    /// <summary>
    /// Adds MultipartFormDataStreamProvider override. This override enables us to use the actual filename.
    /// </summary>
    #region MultipartFormDataStreamProvider Override Class
    public class CustomMultipartFormDataStreamProvider : MultipartFormDataStreamProvider
    {
        public CustomMultipartFormDataStreamProvider(string path)
            : base(path)
        { }

        public override string GetLocalFileName(System.Net.Http.Headers.HttpContentHeaders headers)
        {
            var name = !string.IsNullOrWhiteSpace(headers.ContentDisposition.FileName) ? headers.ContentDisposition.FileName : "NoName";
            return name.Replace("\"", string.Empty); //this is here because Chrome submits files in quotation marks which get treated as part of the filename and get escaped
        }
    } 
    #endregion
}