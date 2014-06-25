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
	
$resizedImage = imagecreatetruecolor($imgW, $imgH);
imagecopyresampled($resizedImage, $source_image, 0, 0, 0, 0, $imgW,
            $imgH, $imgInitW, $imgInitH);


$dest_image = imagecreatetruecolor($cropW, $cropH);
imagecopyresampled($dest_image, $resizedImage, 0, 0, $imgX1, $imgY1, $cropW,
            $cropH, $cropW, $cropH);


ob_start();
imagejpeg($dest_image, null, $jpeg_quality);
$imgData = ob_get_clean();
ob_end_clean();

$response = array(
    "status" => 'success',
    "url" => 'data:'.$what['mime'].';base64,'.base64_encode($imgData),
  );
 echo json_encode($response);