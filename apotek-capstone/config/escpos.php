<?php

return [
    'printer_name' => env('RECEIPT_PRINTER_NAME'),
    'columns' => (int) env('RECEIPT_PRINTER_COLUMNS', 40),
];
