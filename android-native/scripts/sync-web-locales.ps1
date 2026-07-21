param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"

$androidRes = Join-Path $RepositoryRoot "android-native\app\src\main\res"
$baseStringsPath = Join-Path $androidRes "values\strings.xml"
$webLocalesRoot = Join-Path $RepositoryRoot "client\public\locales"
$webEnglishPath = Join-Path $webLocalesRoot "en\translation.json"

$localeQualifiers = @{
    ar = "ar"
    bn = "bn"
    de = "de"
    es = "es"
    fr = "fr"
    gu = "gu"
    hi = "hi"
    it = "it"
    ja = "ja"
    kn = "kn"
    ko = "ko"
    ml = "ml"
    mr = "mr"
    pa = "pa"
    pt = "pt"
    ru = "ru"
    ta = "ta"
    te = "te"
    th = "th"
    tr = "tr"
    ur = "ur"
    zh = "zh"
}

function ConvertTo-FlatDictionary {
    param(
        [Parameter(Mandatory)]$Object,
        [string]$Prefix = ""
    )

    $result = @{}
    foreach ($property in $Object.PSObject.Properties) {
        $key = if ($Prefix) { "$Prefix.$($property.Name)" } else { $property.Name }
        if ($property.Value -is [System.Management.Automation.PSCustomObject]) {
            $nested = ConvertTo-FlatDictionary -Object $property.Value -Prefix $key
            foreach ($nestedKey in $nested.Keys) {
                $result[$nestedKey] = $nested[$nestedKey]
            }
        } elseif ($property.Value -is [string]) {
            $result[$key] = $property.Value
            if (-not $result.ContainsKey($property.Name)) {
                $result[$property.Name] = $property.Value
            }
        }
    }
    return $result
}

function Get-AndroidPlaceholders {
    param([string]$Value)
    if ([string]::IsNullOrEmpty($Value)) {
        return @()
    }
    return @([regex]::Matches($Value, '%(?:\d+\$)?[-#+ 0,(]*\d*(?:\.\d+)?[a-zA-Z%]') | ForEach-Object Value)
}

function Test-PlaceholderCompatibility {
    param(
        [string]$Source,
        [string]$Translation
    )

    $sourcePlaceholders = @(Get-AndroidPlaceholders $Source | Sort-Object)
    if ($sourcePlaceholders.Count -eq 0) {
        return $true
    }
    $translatedPlaceholders = @(Get-AndroidPlaceholders $Translation | Sort-Object)
    return (($sourcePlaceholders -join "|") -eq ($translatedPlaceholders -join "|"))
}

function ConvertTo-AndroidString {
    param([string]$Value)

    if ($null -eq $Value) {
        return ""
    }

    $escaped = $Value `
        -replace '\\', '\\\\' `
        -replace "`r`n", '\n' `
        -replace "`n", '\n' `
        -replace "'", "\'"

    if ($escaped -match '^\s*[@?]') {
        $firstSpecialIndex = $escaped.IndexOfAny([char[]]"@?")
        $escaped = $escaped.Insert($firstSpecialIndex, '\')
    }

    return $escaped
}

[xml]$baseXml = Get-Content $baseStringsPath -Raw -Encoding UTF8
$webEnglish = ConvertTo-FlatDictionary ((Get-Content $webEnglishPath -Raw -Encoding UTF8) | ConvertFrom-Json)

$englishValueToKeys = @{}
foreach ($key in $webEnglish.Keys) {
    $value = $webEnglish[$key]
    if (-not [string]::IsNullOrWhiteSpace($value) -and -not $englishValueToKeys.ContainsKey($value)) {
        $englishValueToKeys[$value] = $key
    }
}

foreach ($languageCode in $localeQualifiers.Keys | Sort-Object) {
    $webPath = Join-Path $webLocalesRoot "$languageCode\translation.json"
    if (-not (Test-Path $webPath)) {
        continue
    }

    $translations = ConvertTo-FlatDictionary ((Get-Content $webPath -Raw -Encoding UTF8) | ConvertFrom-Json)
    $qualifier = $localeQualifiers[$languageCode]
    $targetDirectory = Join-Path $androidRes "values-$qualifier"
    $targetPath = Join-Path $targetDirectory "strings.xml"
    New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null

    $settings = New-Object System.Xml.XmlWriterSettings
    $settings.Indent = $true
    $settings.IndentChars = "    "
    $settings.Encoding = New-Object System.Text.UTF8Encoding($false)
    $settings.OmitXmlDeclaration = $false

    $writer = [System.Xml.XmlWriter]::Create($targetPath, $settings)
    try {
        $writer.WriteStartDocument()
        $writer.WriteStartElement("resources")

        foreach ($node in $baseXml.resources.string) {
            if ($node.translatable -eq "false") {
                continue
            }

            $name = [string]$node.name
            $source = [string]$node.InnerText
            $translation = $null

            if ($translations.ContainsKey($name)) {
                $translation = [string]$translations[$name]
            } elseif ($englishValueToKeys.ContainsKey($source)) {
                $webKey = $englishValueToKeys[$source]
                if ($translations.ContainsKey($webKey)) {
                    $translation = [string]$translations[$webKey]
                }
            }

            if ([string]::IsNullOrWhiteSpace($translation)) {
                continue
            }
            if (-not (Test-PlaceholderCompatibility -Source $source -Translation $translation)) {
                continue
            }

            $writer.WriteStartElement("string")
            $writer.WriteAttributeString("name", $name)
            $writer.WriteString((ConvertTo-AndroidString $translation))
            $writer.WriteEndElement()
        }

        $writer.WriteEndElement()
        $writer.WriteEndDocument()
    } finally {
        $writer.Dispose()
    }
}

Write-Output "Android locale resources synchronized from Web locale bundles."

