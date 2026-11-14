<?php

namespace App\Services;

use App\Models\Penjualan;
use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\Printer;
use RuntimeException;

class ReceiptPrinter
{
    public function print(Penjualan $transaksi): void
    {
        $printerName = trim((string) config('escpos.printer_name'));
        if ($printerName === '') {
            throw new RuntimeException('RECEIPT_PRINTER_NAME belum dikonfigurasi.');
        }

        $columns = max(24, min(48, (int) config('escpos.columns', 40)));
        $printer = new Printer(new WindowsPrintConnector($printerName));

        try {
            $printer->setJustification(Printer::JUSTIFY_CENTER);
            $printer->selectPrintMode(Printer::MODE_EMPHASIZED);
            $printer->text(mb_strtoupper($transaksi->user->apotek ?? 'APOTEK', 'UTF-8')."\n");
            $printer->selectPrintMode();
            $printer->text("STRUK PENJUALAN\n");
            $printer->setJustification(Printer::JUSTIFY_LEFT);
            $printer->text(str_repeat('-', $columns)."\n");
            $printer->text('No: '.$transaksi->no_faktur."\n");
            $printer->text('Tanggal: '.$transaksi->tanggal_penjualan->format('d/m/Y H:i')."\n");
            $printer->text('Kasir: '.$transaksi->user->name."\n");
            $printer->text(str_repeat('-', $columns)."\n");

            foreach ($transaksi->detail as $detail) {
                foreach ($this->wrap((string) $detail->obat->nama_obat, $columns) as $line) {
                    $printer->text($line."\n");
                }

                $quantityAndPrice = $detail->jumlah.' x Rp '.number_format((float) $detail->harga_jual, 0, ',', '.');
                $subtotal = 'Rp '.number_format((float) $detail->subtotal, 0, ',', '.');
                $printer->text($this->alignedLine($quantityAndPrice, $subtotal, $columns));
            }

            $printer->text(str_repeat('-', $columns)."\n");
            $printer->selectPrintMode(Printer::MODE_EMPHASIZED);
            $printer->text($this->alignedLine('TOTAL', 'Rp '.number_format((float) $transaksi->total, 0, ',', '.'), $columns));
            $printer->selectPrintMode();
            $printer->feed(2);
            $printer->setJustification(Printer::JUSTIFY_CENTER);
            $printer->text("Terima kasih\n");
            $printer->feed(3);
        } finally {
            $printer->close();
        }
    }

    private function alignedLine(string $left, string $right, int $columns): string
    {
        $right = mb_strimwidth($right, 0, $columns, '', 'UTF-8');
        $leftWidth = max(0, $columns - mb_strwidth($right, 'UTF-8'));
        $left = mb_strimwidth($left, 0, $leftWidth, '', 'UTF-8');

        return $left.str_repeat(' ', $leftWidth - mb_strwidth($left, 'UTF-8')).$right."\n";
    }

    /**
     * @return list<string>
     */
    private function wrap(string $text, int $width): array
    {
        $words = preg_split('/\s+/u', trim($text), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $lines = [];
        $line = '';

        foreach ($words as $word) {
            if ($line !== '' && mb_strwidth($line.' '.$word, 'UTF-8') > $width) {
                $lines[] = $line;
                $line = '';
            }

            foreach (mb_str_split($word, 1, 'UTF-8') as $character) {
                if (mb_strwidth($line.$character, 'UTF-8') > $width) {
                    $lines[] = $line;
                    $line = '';
                }

                $line .= $character;
            }

            if ($line !== '' && mb_strwidth($line, 'UTF-8') < $width) {
                $line .= ' ';
            }
        }

        if ($line !== '') {
            $lines[] = rtrim($line);
        }

        return $lines === [] ? [''] : $lines;
    }
}
