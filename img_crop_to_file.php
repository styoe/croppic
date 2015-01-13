<?php
/*
*	!!! THIS IS JUST AN EXAMPLE !!!, PLEASE USE ImageMagick or some other quality image processing libraries
*/

$imgUrl = $_POST['imgUrl'];
$imgInitW = $_POST['imgInitW'];
$imgInitH = $_POST['imgInitH'];
$imgW = $_POST['imgW'];
$imgH = $_POST['imgH'];
$imgY1 = $_POST['imgY1'];
$imgX1 = $_POST['imgX1'];
$cropW = $_POST['cropW'];
$cropH = $_POST['cropH'];
$angle = $_POST['rotation'];

$jpeg_quality = 100;

$what = getimagesize($imgUrl);
switch(strtolower($what['mime']))
{
    case 'image/png':
		$source_image = imagecreatefrompng($imgUrl);
        break;
    case 'image/jpeg':
		$source_image = imagecreatefromjpeg($imgUrl);
        break;
    case 'image/gif':
		$source_image = imagecreatefromgif($imgUrl);
        break;
    default:
        echo json_encode(array(
            'success' => false,
            'message' => 'image type not supported',
        ));
        return;
}

// resize the original image to size of editor
$resizedImage = imagecreatetruecolor($imgW, $imgH);
imagecopyresampled($resizedImage, $source_image, 0, 0, 0, 0, $imgW, $imgH, $imgInitW, $imgInitH);

// rotate the rezized image
$rotated_image = imagerotate($resizedImage, -$angle, 0);
// find new width & height of rotated image
$rotated_width = imagesx($rotated_image);
$rotated_height = imagesy($rotated_image);
// diff between rotated & original sizes
$dx = $rotated_width - $imgW;
$dy = $rotated_height - $imgH;

// crop rotated image to fit into original rezized rectangle
$cropped_rotated_image = imagecreatetruecolor($imgW, $imgH);
imagecolortransparent($cropped_rotated_image, imagecolorallocate($cropped_rotated_image, 0, 0, 0));
imagecopyresampled($cropped_rotated_image, $rotated_image, 0, 0, $dx / 2, $dy / 2, $imgW, $imgH, $imgW, $imgH);

// crop image into selected area
$final_image = imagecreatetruecolor($cropW, $cropH);
imagecolortransparent($final_image, imagecolorallocate($final_image, 0, 0, 0));
imagecopyresampled($final_image, $cropped_rotated_image, 0, 0, $imgX1, $imgY1, $cropW, $cropH, $cropW, $cropH);

ob_start();
imagejpeg($final_image, null, $jpeg_quality);
$imgData = ob_get_clean();
ob_end_clean();

$response = array(
    "status" => 'success',
    "url" => 'data:'.$what['mime'].';base64,'.base64_encode($imgData),
);
echo json_encode($response);