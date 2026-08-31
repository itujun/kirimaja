# Cleanup Low-Priority: Shipment Module

File berikut dihapus karena terkonfirmasi dead code (tidak diimpor/dipakai
di mana pun setelah pengecekan grep menyeluruh):

- `src/modules/shipments/dto/update-shipment.dto.ts`
  UpdateShipmentDto didefinisikan tapi ShipmentsController tidak pernah
  punya endpoint PATCH/PUT yang memakainya.

Tidak ada file lain yang diubah di backend untuk batch Low ini.
Silakan hapus file tersebut secara manual di repo lokal kamu:

  rm src/modules/shipments/dto/update-shipment.dto.ts
