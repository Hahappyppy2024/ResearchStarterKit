param([string]$Manifest,[string]$Output)
$ErrorActionPreference='Stop'
$existing=Get-Process POWERPNT -ErrorAction SilentlyContinue
$app=$null;$presentation=$null
function Color([int]$r,[int]$g,[int]$b){return $r+256*$g+65536*$b}
function TextBox($slide,[string]$text,[int]$x,[int]$y,[int]$w,[int]$h,[int]$size,[int]$color) {
 $shape=$slide.Shapes.AddTextbox(1,$x,$y,$w,$h)
 $shape.TextFrame.TextRange.Text=$text
 $shape.TextFrame.TextRange.Font.Name='Microsoft YaHei'
 $shape.TextFrame.TextRange.Font.NameFarEast='Microsoft YaHei'
 $shape.TextFrame.TextRange.Font.Size=$size
 $shape.TextFrame.TextRange.Font.Color.RGB=$color
 return $shape
}
try {
 New-Item -ItemType Directory -Force -Path $Output | Out-Null
 $modules=Get-Content -LiteralPath $Manifest -Raw -Encoding UTF8 | ConvertFrom-Json
 $app=New-Object -ComObject PowerPoint.Application
 foreach($m in $modules) {
  $presentation=$app.Presentations.Add(0)
  $presentation.PageSetup.SlideWidth=960;$presentation.PageSetup.SlideHeight=540
  $pages=@(
   @{title=$m.name;subtitle=$m.en;body=$m.summary+"`r`n`r`n学习目标：用自己的话解释概念，并能回答本模块的问题。"},
   @{title='面试问题';subtitle='先尝试口述，再补充答案';body=$m.questions},
   @{title='我的理解与练习';subtitle='待填写 · 复习笔记';body="1. 核心概念：`r`n2. 工作流程 / 公式 / 示意图：`r`n3. 一个具体例子：`r`n4. 适用条件与局限：`r`n5. 下一次要复习的问题："}
  )
  $i=0
  foreach($page in $pages) {
   $i++;$slide=$presentation.Slides.Add($i,12)
   $slide.FollowMasterBackground=0;$slide.Background.Fill.ForeColor.RGB=(Color 247 247 239)
   $bar=$slide.Shapes.AddShape(1,0,0,15,540);$bar.Fill.ForeColor.RGB=(Color 40 89 75);$bar.Line.Visible=0
   [void](TextBox $slide $page.title 55 48 850 65 32 (Color 40 89 75))
   [void](TextBox $slide $page.subtitle 58 117 830 36 16 (Color 121 140 108))
   [void](TextBox $slide $page.body 58 185 830 280 23 (Color 51 72 57))
   [void](TextBox $slide ('AI 学习本 · 学习模板    '+$i+' / 3') 58 490 830 25 11 (Color 130 145 117))
  }
  $presentation.SaveAs((Join-Path $Output ($m.id+'.pptx')),24)
  $presentation.Close();[void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation);$presentation=$null
 }
} finally {
 if($presentation){$presentation.Close()}
 if($app){if(-not $existing){$app.Quit()};[void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)}
}
