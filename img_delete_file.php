<?php
/*
*	!!! THIS IS JUST AN EXAMPLE !!!
*/
$deleteUrl = $_POST['deleteUrl'];

// delete the cropped file
unlink ($deleteUrl);

if (!file_exists ($deleteUrl)) {
    $response = Array(
	    "status" => 'success',
        );
} else {
    $response = Array(
	    "status" => 'error',
        );
}
print json_encode($response);
