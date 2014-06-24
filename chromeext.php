<?php
$fOUT = fopen("data.csv", "w");
$post = json_decode($_POST["records"]);
foreach ($post as $record) {
        $d = date("D n j Y h:i:sa", $record[0]/1000);
        fputs($fOUT,"2,{$record[1]},{$record[2]},Clean,False,False,00:00:00,0,," . $d . "," . $d . ",EGVData,60000,1000\n");
}
fclose($fOUT);
print file_get_contents("data.csv");