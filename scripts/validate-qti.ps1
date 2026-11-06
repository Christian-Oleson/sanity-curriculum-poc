# Validates exported QTI items against the official 1EdTech QTI 3.0 ASI schema.
#   pwsh scripts/validate-qti.ps1                     (exports both sample items in en + es, then validates)
#   pwsh scripts/validate-qti.ps1 -Files a.xml,b.xml  (validates the given files only)
# The XSD lives in qti-check/xsd; its SSML/XInclude/xml imports are fetched by the resolver.
# Two exceptions: .NET's XSD 1.0 engine can't compile the official MathML 3 and SSML 1.1 schemas, so
# the resolver substitutes lax stand-ins (qti-check/xsd/mathml3-stub.xsd, ssml-stub.xsd). Everything
# QTI itself defines is fully validated; content inside <m:math> or SSML elements would not be checked.
param([string[]]$Files)
$ErrorActionPreference = 'Stop'
if ($Files) { $Files = $Files | ForEach-Object { $_ -split ',' } }   # pwsh -File passes a,b as one string
$root = Split-Path -Parent $PSScriptRoot
$check = Join-Path $root 'qti-check'
$xsd = Join-Path $check 'xsd\imsqti_asiv3p0_v1p0.xsd'

class QtiResolver : System.Xml.XmlUrlResolver {
  [string]$Dir
  [System.Xml.XmlUrlResolver]$Inner = [System.Xml.XmlUrlResolver]::new()
  QtiResolver([string]$dir) { $this.Dir = $dir }
  [object] GetEntity([uri]$absoluteUri, [string]$role, [type]$ofObjectToReturn) {
    if ($env:QTI_DEBUG) { [Console]::Error.WriteLine("resolve: $($absoluteUri.AbsoluteUri)") }
    if ($absoluteUri.AbsoluteUri -like '*mathml3.xsd') { return [System.IO.File]::OpenRead((Join-Path $this.Dir 'mathml3-stub.xsd')) }
    if ($absoluteUri.AbsoluteUri -like '*ssmlv1p1-core.xsd') { return [System.IO.File]::OpenRead((Join-Path $this.Dir 'ssml-stub.xsd')) }
    return $this.Inner.GetEntity($absoluteUri, $role, $ofObjectToReturn)
  }
}

# Compile the schema set once.
$resolver = [QtiResolver]::new((Join-Path $check 'xsd'))
$schemas = [System.Xml.Schema.XmlSchemaSet]::new()
$schemas.XmlResolver = $resolver
[void]$schemas.Add('http://www.imsglobal.org/xsd/imsqtiasi_v3p0', $xsd)
$schemas.Compile()
"Compiled QTI 3.0 schema set ($($schemas.Count) schemas incl. imports)"

if (-not $Files) {
  # The export endpoint is staff-only (it contains the answer key); authenticate with the local export token.
  $tokenLine = Get-Content (Join-Path $root 'web' '.env.local') | Where-Object { $_ -like 'QTI_EXPORT_TOKEN=*' } | Select-Object -First 1
  if (-not $tokenLine) { throw 'QTI_EXPORT_TOKEN missing from web/.env.local' }
  $headers = @{Authorization = "Bearer $($tokenLine.Substring('QTI_EXPORT_TOKEN='.Length))"}
  $Files = foreach ($id in 'add-unlike-1', 'equiv-1') {
    foreach ($lang in 'en', 'es') {
      $f = Join-Path $check "$id-$lang.xml"
      Invoke-WebRequest "http://localhost:3000/api/qti/$($id)?lang=$lang" -Headers $headers -OutFile $f | Out-Null
      $f
    }
  }
}

$failed = 0
foreach ($file in $Files) {
  $name = Split-Path -Leaf $file
  $errors = [System.Collections.Generic.List[string]]::new()
  $settings = [System.Xml.XmlReaderSettings]::new()
  $settings.ValidationType = [System.Xml.ValidationType]::Schema
  $settings.ValidationFlags = $settings.ValidationFlags -bor [System.Xml.Schema.XmlSchemaValidationFlags]::ReportValidationWarnings
  $settings.Schemas = $schemas
  $settings.add_ValidationEventHandler({ param($s, $e) $errors.Add("$($e.Severity): $($e.Message) (line $($e.Exception.LineNumber))") }.GetNewClosure())

  $reader = [System.Xml.XmlReader]::Create($file, $settings)
  try { while ($reader.Read()) {} } finally { $reader.Close() }

  if ($errors.Count -eq 0) { "VALID    $name" }
  else { $failed++; "INVALID  $name"; $errors | ForEach-Object { "   $_" } }
}
if ($failed) { exit 1 }
