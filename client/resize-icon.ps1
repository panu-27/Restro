Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('C:\Users\Pranav\Desktop\Restro\client\public\icon-512.png')
$dst = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.DrawImage($src, 0, 0, 512, 512)
$g.Dispose()
$src.Dispose()
$dst.Save('C:\Users\Pranav\Desktop\Restro\client\public\icon-512.png', [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose()
Write-Host "Done: resized to 512x512"
