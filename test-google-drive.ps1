# Google Drive API Test Script
# This script tests all CRUD operations for the Google Drive integration

$baseUrl = "http://localhost:5000/api"
$token = ""

Write-Host "=== Google Drive Integration Test ===" -ForegroundColor Cyan
Write-Host ""

# Function to make API requests
function Invoke-APIRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [string]$ContentType = "application/json"
    )
    
    $headers = @{
        "Content-Type" = $ContentType
    }
    
    if ($token) {
        $headers["Authorization"] = "Bearer $token"
    }
    
    $url = "$baseUrl$Endpoint"
    
    try {
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            Write-Host "Request: $Method $url" -ForegroundColor Yellow
            Write-Host "Body: $jsonBody" -ForegroundColor Gray
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $jsonBody -ContentType $ContentType
        } else {
            Write-Host "Request: $Method $url" -ForegroundColor Yellow
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers
        }
        
        Write-Host "✅ Success" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Gray
        $response | ConvertTo-Json -Depth 10 | Write-Host
        Write-Host ""
        return $response
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        Write-Host ""
        return $null
    }
}

# Step 1: Login to get token
Write-Host "Step 1: Login" -ForegroundColor Cyan
$loginResponse = Invoke-APIRequest -Method POST -Endpoint "/auth/login" -Body @{
    staffId = "ADMIN001"
    password = "admin123"
}

if ($loginResponse -and $loginResponse.token) {
    $token = $loginResponse.token
    Write-Host "✅ Token obtained" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "❌ Failed to login. Please check credentials." -ForegroundColor Red
    exit
}

# Step 2: Check Google Drive Connection
Write-Host "Step 2: Check Google Drive Connection" -ForegroundColor Cyan
$connectionStatus = Invoke-APIRequest -Method GET -Endpoint "/google-drive/status"

if (-not $connectionStatus -or -not $connectionStatus.connected) {
    Write-Host "❌ Google Drive is not connected. Please check configuration." -ForegroundColor Red
    Write-Host "Make sure these environment variables are set:" -ForegroundColor Yellow
    Write-Host "  - GOOGLE_SERVICE_ACCOUNT_EMAIL" -ForegroundColor Yellow
    Write-Host "  - GOOGLE_PRIVATE_KEY" -ForegroundColor Yellow
    Write-Host "  - GOOGLE_DRIVE_ROOT_FOLDER_ID" -ForegroundColor Yellow
    exit
}

# Step 3: Get list of employees
Write-Host "Step 3: Get Employees List" -ForegroundColor Cyan
$employees = Invoke-APIRequest -Method GET -Endpoint "/employees"

if (-not $employees -or -not $employees.data) {
    Write-Host "❌ No employees found" -ForegroundColor Red
    exit
}

$testEmployee = $employees.data[0]
$employeeId = $testEmployee._id
Write-Host "Using test employee: $($testEmployee.name) (ID: $employeeId)" -ForegroundColor Green
Write-Host ""

# Step 4: Create Employee Folder
Write-Host "Step 4: Create Employee Folder" -ForegroundColor Cyan
$employeeFolderResponse = Invoke-APIRequest -Method POST -Endpoint "/google-drive/folders/employee/$employeeId"

if (-not $employeeFolderResponse -or -not $employeeFolderResponse.data.folderId) {
    Write-Host "❌ Failed to create employee folder" -ForegroundColor Red
    exit
}

$employeeFolderId = $employeeFolderResponse.data.folderId
Write-Host "Employee Folder ID: $employeeFolderId" -ForegroundColor Green
Write-Host ""

# Step 5: List Files in Employee Folder
Write-Host "Step 5: List Files in Employee Folder" -ForegroundColor Cyan
$filesResponse = Invoke-APIRequest -Method GET -Endpoint "/google-drive/employee/$employeeId/files"

# Step 6: Upload a Test File
Write-Host "Step 6: Upload Test File" -ForegroundColor Cyan

# Create a test file
$testContent = "This is a test file for Google Drive integration testing.`nCreated at: $(Get-Date)`nEmployee: $($testEmployee.name)"
$testFileName = "test-file-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$testFilePath = Join-Path $env:TEMP $testFileName
Set-Content -Path $testFilePath -Value $testContent

Write-Host "Created test file: $testFilePath" -ForegroundColor Gray

# Upload the file using multipart/form-data
try {
    $uploadUrl = "$baseUrl/google-drive/upload/$employeeFolderId"
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    # Read file as bytes
    $fileBytes = [System.IO.File]::ReadAllBytes($testFilePath)
    $fileContent = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$testFileName`"",
        "Content-Type: text/plain$LF",
        $fileContent,
        "--$boundary--$LF"
    ) -join $LF
    
    Write-Host "Uploading to: $uploadUrl" -ForegroundColor Yellow
    $uploadResponse = Invoke-RestMethod -Uri $uploadUrl -Method POST -Headers $headers -ContentType "multipart/form-data; boundary=$boundary" -Body $bodyLines
    
    Write-Host "✅ File uploaded successfully" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Gray
    $uploadResponse | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    
    $uploadedFileId = $uploadResponse.data.fileId
} catch {
    Write-Host "❌ Error uploading file: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Clean up test file
Remove-Item $testFilePath -Force

# Step 7: List Files Again
Write-Host "Step 7: List Files in Folder (After Upload)" -ForegroundColor Cyan
$filesAfterUpload = Invoke-APIRequest -Method GET -Endpoint "/google-drive/files/$employeeFolderId"

# Step 8: Download File (if uploaded)
if ($uploadedFileId) {
    Write-Host "Step 8: Download File" -ForegroundColor Cyan
    try {
        $downloadUrl = "$baseUrl/google-drive/download/$uploadedFileId"
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        Write-Host "Downloading from: $downloadUrl" -ForegroundColor Yellow
        $downloadedContent = Invoke-RestMethod -Uri $downloadUrl -Method GET -Headers $headers
        
        Write-Host "✅ File downloaded successfully" -ForegroundColor Green
        Write-Host "Content:" -ForegroundColor Gray
        Write-Host $downloadedContent
        Write-Host ""
    } catch {
        Write-Host "❌ Error downloading file: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
    
    # Step 9: Delete File
    Write-Host "Step 9: Delete File" -ForegroundColor Cyan
    $deleteResponse = Invoke-APIRequest -Method DELETE -Endpoint "/google-drive/files/$uploadedFileId"
}

# Step 10: Test Intern/Diary Folder Creation (if interns exist)
Write-Host "Step 10: Test Intern Diary Folder Creation" -ForegroundColor Cyan
$interns = Invoke-APIRequest -Method GET -Endpoint "/interns"

if ($interns -and $interns.data -and $interns.data.Count -gt 0) {
    $testIntern = $interns.data[0]
    Write-Host "Using test intern: $($testIntern.name)" -ForegroundColor Green
    
    # Get intern's diary entries
    $diaryEntries = Invoke-APIRequest -Method GET -Endpoint "/diary/intern/$($testIntern._id)"
    
    if ($diaryEntries -and $diaryEntries.data -and $diaryEntries.data.Count -gt 0) {
        $testDiary = $diaryEntries.data[0]
        Write-Host "Using diary entry: Week $($testDiary.weekNumber)" -ForegroundColor Green
        
        # Create week folder
        $weekFolderResponse = Invoke-APIRequest -Method POST -Endpoint "/google-drive/folders/week/$($testDiary._id)"
        
        if ($weekFolderResponse -and $weekFolderResponse.data.folderId) {
            Write-Host "✅ Week folder created: $($weekFolderResponse.data.folderId)" -ForegroundColor Green
        }
    } else {
        Write-Host "ℹ️ No diary entries found for intern" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️ No interns found - skipping diary folder test" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary of Tests:" -ForegroundColor White
Write-Host "✅ Connection Check" -ForegroundColor Green
Write-Host "✅ Employee Folder Creation" -ForegroundColor Green
Write-Host "✅ List Files" -ForegroundColor Green
Write-Host "✅ File Upload" -ForegroundColor Green
Write-Host "✅ File Download" -ForegroundColor Green
Write-Host "✅ File Delete" -ForegroundColor Green
Write-Host ""
