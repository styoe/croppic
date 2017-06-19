<?php
$tmp_dir = $_SERVER['DOCUMENT_ROOT'] . '/tmp/';
$filename = explode('/', $_POST['imgUrl']);
$filename = $filename[count($filename) - 1];
$imgUrl = $tmp_dir . $filename;

// original sizes
$imgInitW = $_POST['imgInitW'];
$imgInitH = $_POST['imgInitH'];

// resized sizes
$imgW = $_POST['imgW'];
$imgH = $_POST['imgH'];

// offsets
$imgY1 = $_POST['imgY1'];
$imgX1 = $_POST['imgX1'];

// crop box
$cropW = $image_config[1]['w'];
$cropH = $image_config[1]['h'];

// rotation angle
$angle = $_POST['rotation'];

$jpeg_quality = 100;

$output_filename = $client->client_id.time();
while (file_exists($tmp_dir . $output_filename)) {
    $filename_array = explode('.', $output_filename);
    $output_filename = $filename_array[0] . '_' . mt_rand(0, 1000) . '.' . $filename_array[count($filename_array) - 1];
}
$what = getimagesize($imgUrl);

switch (strtolower($what['mime'])) {
    case 'image/png':
	$img_r = imagecreatefrompng($imgUrl);
	$source_image = imagecreatefrompng($imgUrl);
	$type = '.png';
	break;
    case 'image/jpeg':
	$img_r = imagecreatefromjpeg($imgUrl);
	$source_image = imagecreatefromjpeg($imgUrl);
	error_log("jpg");
	$type = '.jpeg';
	break;
    case 'image/gif':
	$img_r = imagecreatefromgif($imgUrl);
	$source_image = imagecreatefromgif($imgUrl);
	$type = '.gif';
	break;
    default:
	$arr = Array(
	    "status" => 'error',
	    "message" => 'Тип файла не поддержвивается. Выберите другой файл'
	);
	break;
}
$output_filename .= $type;

//Check write Access to Directory

if (!is_writable(dirname($tmp_dir.$output_filename))) {
    $arr = Array(
	"status" => 'error',
	"message" => 'Ошибка загрузки файла'
    );
} else {
    // resize the original image to size of editor
    $image = imagecreatetruecolor($imgInitW, $imgInitH);
    imageAlphaBlending($image, false);
    imageSaveAlpha($image, true);

    // rotate the rezized image
    if ($angle) {
	$image = imagerotate($source_image, -$angle, 0);
    } else {
	$image = $source_image;
    }
    $image2 = imagecreatetruecolor($imgW, $imgH);
    imageAlphaBlending($image2, false);
    imageSaveAlpha($image2, true);
    imagecopyresampled($image2, $image, 0, 0, 0, 0, $imgW, $imgH, $imgInitW, $imgInitH);

    // crop image into selected area
    $final_image = imagecreatetruecolor($cropW, $cropH);
    imageAlphaBlending($final_image, false);
    imageSaveAlpha($final_image, true);
    //imagecolortransparent($final_image, imagecolorallocate($final_image, 0, 0, 0));
    imagecopyresampled($final_image, $image2, 0, 0, $imgX1, $imgY1, $cropW+1, $cropH+1, $cropW, $cropH);

    // finally output png image
    //imagepng($final_image, $tmp_dir.$output_filename, $png_quality);
    imagejpeg($final_image, $tmp_dir.$output_filename, $jpeg_quality);
	$arr = Array(
	    "status" => 'success',
	    "url" => '/tmp/'.$output_filename
	);
}
echo json_encode($arr);
