# Generate Simple-SCM (Pocket SCM) app icons (no white edge)
# Design: solid deep-indigo background + white supply-network graph (center node + 3 satellites)
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root "assets"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$size = 1024
$indigo = [System.Drawing.Color]::FromArgb(255, 63, 81, 181)   # #3F51B5 deep indigo
$white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)

function New-Canvas($transparent, $fillColor) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    if ($transparent) {
        $g.Clear([System.Drawing.Color]::Transparent)
    } else {
        $g.Clear($fillColor)
    }
    return @($bmp, $g)
}

function Draw-Network($g, $color) {
    # center node + 3 satellite nodes connected by lines (supply network)
    $cx = 512
    $cy = 512
    $R = 210
    $pen = [System.Drawing.Pen]::new($color, 30)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $brush = [System.Drawing.SolidBrush]::new($color)

    # satellite positions (top, bottom-right, bottom-left)
    $n1x = $cx
    $n1y = $cy - $R
    $n2x = $cx + ($R * 0.866)
    $n2y = $cy + ($R * 0.5)
    $n3x = $cx - ($R * 0.866)
    $n3y = $cy + ($R * 0.5)

    # connecting lines
    $g.DrawLine($pen, $cx, $cy, $n1x, $n1y)
    $g.DrawLine($pen, $cx, $cy, $n2x, $n2y)
    $g.DrawLine($pen, $cx, $cy, $n3x, $n3y)

    # satellites (small circles)
    $sr = 62
    $g.FillEllipse($brush, $n1x - $sr, $n1y - $sr, $sr * 2, $sr * 2)
    $g.FillEllipse($brush, $n2x - $sr, $n2y - $sr, $sr * 2, $sr * 2)
    $g.FillEllipse($brush, $n3x - $sr, $n3y - $sr, $sr * 2, $sr * 2)

    # center node (big circle)
    $cr = 95
    $g.FillEllipse($brush, $cx - $cr, $cy - $cr, $cr * 2, $cr * 2)

    $pen.Dispose()
    $brush.Dispose()
}

function Save-Png($bmp, $g, $path) {
    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "saved: $path"
}

# 1. icon.png: solid indigo + white network
$c = New-Canvas $false $indigo
Draw-Network $c[1] $white
Save-Png $c[0] $c[1] (Join-Path $dir "icon.png")

# 2. android-icon-foreground.png: transparent + white network
$c = New-Canvas $true $indigo
Draw-Network $c[1] $white
Save-Png $c[0] $c[1] (Join-Path $dir "android-icon-foreground.png")

# 3. android-icon-background.png: solid indigo
$c = New-Canvas $false $indigo
Save-Png $c[0] $c[1] (Join-Path $dir "android-icon-background.png")

# 4. android-icon-monochrome.png: transparent + white network
$c = New-Canvas $true $indigo
Draw-Network $c[1] $white
Save-Png $c[0] $c[1] (Join-Path $dir "android-icon-monochrome.png")

# 5. favicon.png
$bmp = New-Object System.Drawing.Bitmap((Join-Path $dir "icon.png"))
$fav = New-Object System.Drawing.Bitmap(48, 48)
$g = [System.Drawing.Graphics]::FromImage($fav)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($bmp, 0, 0, 48, 48)
$g.Dispose()
$fav.Save((Join-Path $dir "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$fav.Dispose()
$bmp.Dispose()
Write-Host "saved favicon.png"


