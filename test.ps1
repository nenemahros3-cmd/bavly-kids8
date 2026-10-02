[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$body = '{"action":"save_inventory_item","payload":{"code":"M-101","name":"طقم أطفال صيفي بطوط","colors":"أصفر / أزرق","size":"2-4","qty":35,"costPrice":120,"sellPrice":190}}'
$response = Invoke-RestMethod -Uri "https://script.google.com/macros/s/AKfycbwcx9W_p5KTy5960OXaiW2j40aensBmcm87nEFG7oQGidP_rKscFHwYh9LSWxPECWec/exec" -Method Post -Body $body -ContentType "text/plain"
Write-Output $response
