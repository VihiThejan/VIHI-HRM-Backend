# Simple Google Drive API Test
$baseUrl = "http://localhost:5000/api"
$token = ""

Write-Host "=== Google Drive Integration Test ===" -ForegroundColor Cyan

# Step 1: Login
Write-Host "`n1. Login..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body (@{staffId="ADMIN001";password="admin123"} | ConvertTo-Json) -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "   ✅ Login successful" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Check Google Drive Connection
Write-Host "`n2. Checking Google Drive connection..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "$baseUrl/google-drive/status" -Method GET -Headers $headers
    Write-Host "   ✅ Connected: $($status.connected)" -ForegroundColor Green
    Write-Host "   Message: $($status.message)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Connection check failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit
}

# Step 3: Get employees
Write-Host "`n3. Getting employees list..." -ForegroundColor Yellow
try {
    $employees = Invoke-RestMethod -Uri "$baseUrl/employees" -Method GET -Headers $headers
    $testEmployee = $employees.data[0]
    Write-Host "   ✅ Found $($employees.data.Count) employees" -ForegroundColor Green
    Write-Host "   Using: $($testEmployee.name) (ID: $($testEmployee._id))" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed to get employees: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$employeeId = $testEmployee._id

# Step 4: Create Employee Folder
Write-Host "`n4. Creating employee folder..." -ForegroundColor Yellow
try {
    $folderResponse = Invoke-RestMethod -Uri "$baseUrl/google-drive/folders/employee/$employeeId" -Method POST -Headers $headers
    $folderId = $folderResponse.data.folderId
    Write-Host "   ✅ Folder created/retrieved: $folderId" -ForegroundColor Green
    if ($folderResponse.data.subfolders) {
        Write-Host "   Subfolders created: Contracts, Performance Reviews, Personal Documents" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Failed to create folder: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit
}

# Step 5: List files in employee folder
Write-Host "`n5. Listing files in employee folder..." -ForegroundColor Yellow
try {
    $files = Invoke-RestMethod -Uri "$baseUrl/google-drive/employee/$employeeId/files" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($files.data.files.Count) files" -ForegroundColor Green
    if ($files.data.files.Count -gt 0) {
        $files.data.files | ForEach-Object {
            Write-Host "      - $($_.name) ($($_.mimeType))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Failed to list files: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 6: Create and upload a test file
Write-Host "`n6. Uploading test file..." -ForegroundColor Yellow
$testContent = "Google Drive Integration Test`nTimestamp: $(Get-Date)`nEmployee: $($testEmployee.name)"
$testFileName = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$testFilePath = Join-Path $env:TEMP $testFileName
Set-Content -Path $testFilePath -Value $testContent

try {
    # Use PowerShell file upload
    $fileContent = Get-Content $testFilePath -Raw -Encoding UTF8
    $fileBytes = [System.Text.Encoding]::UTF8.GetBytes($fileContent)
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$testFileName`"",
        "Content-Type: text/plain$LF",
        [System.Text.Encoding]::UTF8.GetString($fileBytes),
        "--$boundary--$LF"
    ) -join $LF
    
    $uploadHeaders = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    $uploadResponse = Invoke-RestMethod -Uri "$baseUrl/google-drive/upload/$folderId" -Method POST -Headers $uploadHeaders -Body $bodyLines
    $uploadedFileId = $uploadResponse.data.fileId
    Write-Host "   ✅ File uploaded: $uploadedFileId" -ForegroundColor Green
    Write-Host "   Web Link: $($uploadResponse.data.webViewLink)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Upload failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Remove-Item $testFilePath -Force

# Step 7: List files again
Write-Host "`n7. Listing files after upload..." -ForegroundColor Yellow
try {
    $filesAfter = Invoke-RestMethod -Uri "$baseUrl/google-drive/files/$folderId" -Method GET -Headers $headers
    Write-Host "   ✅ Found $($filesAfter.data.files.Count) files" -ForegroundColor Green
    $filesAfter.data.files | ForEach-Object {
        Write-Host "      - $($_.name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Failed to list files: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 8: Download file
if ($uploadedFileId) {
    Write-Host "`n8. Downloading file..." -ForegroundColor Yellow
    try {
        $downloadResponse = Invoke-RestMethod -Uri "$baseUrl/google-drive/download/$uploadedFileId" -Method GET -Headers $headers
        Write-Host "   ✅ Downloaded successfully" -ForegroundColor Green
        Write-Host "   Content preview: $($downloadResponse.Substring(0, [Math]::Min(100, $downloadResponse.Length)))..." -ForegroundColor Gray
    } catch {
        Write-Host "   ❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Step 9: Delete file
    Write-Host "`n9. Deleting file..." -ForegroundColor Yellow
    try {
        $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/google-drive/files/$uploadedFileId" -Method DELETE -Headers $headers
        Write-Host "   ✅ File deleted successfully" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Delete failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
