import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { logger } from '../config/logger';

// Initialize Google Drive client with service account
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

// Root folder ID from environment
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';

/**
 * Create a folder in Google Drive
 */
export async function createFolder(
    name: string,
    parentId: string = ROOT_FOLDER_ID
): Promise<string> {
    try {
        const response = await drive.files.create({
            requestBody: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            },
            fields: 'id',
        });

        const folderId = response.data.id;
        if (!folderId) {
            throw new Error('Failed to create folder - no ID returned');
        }

        logger.info(`Created Google Drive folder: ${name} (${folderId})`);
        return folderId;
    } catch (error) {
        logger.error('Error creating Google Drive folder:', error);
        throw error;
    }
}

/**
 * Find a folder by name in a parent folder
 */
export async function findFolderByName(
    name: string,
    parentId: string = ROOT_FOLDER_ID
): Promise<string | null> {
    try {
        const response = await drive.files.list({
            q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        const files = response.data.files;
        if (files && files.length > 0) {
            return files[0].id || null;
        }
        return null;
    } catch (error) {
        logger.error('Error finding folder:', error);
        throw error;
    }
}

/**
 * Get or create the Employees root folder
 */
export async function getOrCreateEmployeesFolder(): Promise<string> {
    let folderId = await findFolderByName('Employees', ROOT_FOLDER_ID);
    if (!folderId) {
        folderId = await createFolder('Employees', ROOT_FOLDER_ID);
    }
    return folderId;
}

/**
 * Get or create the Interns root folder
 */
export async function getOrCreateInternsFolder(): Promise<string> {
    let folderId = await findFolderByName('Interns', ROOT_FOLDER_ID);
    if (!folderId) {
        folderId = await createFolder('Interns', ROOT_FOLDER_ID);
    }
    return folderId;
}

/**
 * Get or create an employee's personal folder
 */
export async function getOrCreateEmployeeFolder(
    employeeId: string,
    employeeName: string,
    staffId: string,
    isIntern: boolean = false
): Promise<string> {
    // Format: FirstName_LastName_StaffID
    const folderName = `${employeeName.replace(/\s+/g, '_')}_${staffId}`;

    // Get parent folder (Employees or Interns)
    const parentFolderId = isIntern
        ? await getOrCreateInternsFolder()
        : await getOrCreateEmployeesFolder();

    // Check if folder already exists
    let folderId = await findFolderByName(folderName, parentFolderId);
    if (!folderId) {
        folderId = await createFolder(folderName, parentFolderId);
        logger.info(`Created ${isIntern ? 'intern' : 'employee'} folder: ${folderName}`);
    }

    return folderId;
}

/**
 * Get or create a week folder for intern diary
 */
export async function getOrCreateWeekFolder(
    internFolderId: string,
    weekNumber: number,
    weekStartDate: Date
): Promise<string> {
    // Format: Week_01_2026-01-06
    const dateStr = weekStartDate.toISOString().split('T')[0];
    const weekStr = weekNumber.toString().padStart(2, '0');
    const folderName = `Week_${weekStr}_${dateStr}`;

    // Check if folder already exists
    let folderId = await findFolderByName(folderName, internFolderId);
    if (!folderId) {
        folderId = await createFolder(folderName, internFolderId);
        logger.info(`Created week folder: ${folderName}`);
    }

    return folderId;
}

/**
 * Upload a file to Google Drive
 */
export async function uploadFile(
    fileName: string,
    mimeType: string,
    content: Buffer | Readable,
    folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
    try {
        const media = {
            mimeType,
            body: content instanceof Buffer ? Readable.from(content) : content,
        };

        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
            },
            media,
            fields: 'id, webViewLink',
        });

        const fileId = response.data.id;
        const webViewLink = response.data.webViewLink;

        if (!fileId) {
            throw new Error('Failed to upload file - no ID returned');
        }

        logger.info(`Uploaded file to Google Drive: ${fileName} (${fileId})`);
        return { fileId, webViewLink: webViewLink || '' };
    } catch (error) {
        logger.error('Error uploading file to Google Drive:', error);
        throw error;
    }
}

/**
 * Download a file from Google Drive
 */
export async function downloadFile(fileId: string): Promise<Buffer> {
    try {
        const response = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        );

        return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
        logger.error('Error downloading file from Google Drive:', error);
        throw error;
    }
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFile(fileId: string): Promise<void> {
    try {
        await drive.files.delete({ fileId });
        logger.info(`Deleted file from Google Drive: ${fileId}`);
    } catch (error) {
        logger.error('Error deleting file from Google Drive:', error);
        throw error;
    }
}

/**
 * List files in a folder
 */
export async function listFilesInFolder(
    folderId: string
): Promise<drive_v3.Schema$File[]> {
    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
            orderBy: 'name',
        });

        return response.data.files || [];
    } catch (error) {
        logger.error('Error listing files in folder:', error);
        throw error;
    }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
    fileId: string
): Promise<drive_v3.Schema$File | null> {
    try {
        const response = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType, size, createdTime, webViewLink, parents',
        });

        return response.data;
    } catch (error) {
        logger.error('Error getting file metadata:', error);
        throw error;
    }
}

/**
 * Create standard subfolders for an employee
 */
export async function createEmployeeSubfolders(employeeFolderId: string): Promise<{
    contracts: string;
    performanceReviews: string;
    personalDocuments: string;
}> {
    const contracts = await createFolder('Contracts', employeeFolderId);
    const performanceReviews = await createFolder('Performance Reviews', employeeFolderId);
    const personalDocuments = await createFolder('Personal Documents', employeeFolderId);

    return { contracts, performanceReviews, personalDocuments };
}

/**
 * Check if Google Drive is properly configured
 */
export async function checkDriveConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
            return { connected: false, error: 'GOOGLE_SERVICE_ACCOUNT_EMAIL is missing from .env' };
        }
        if (!process.env.GOOGLE_PRIVATE_KEY) {
            return { connected: false, error: 'GOOGLE_PRIVATE_KEY is missing from .env' };
        }
        if (!ROOT_FOLDER_ID) {
            return { connected: false, error: 'GOOGLE_DRIVE_ROOT_FOLDER_ID is missing from .env' };
        }

        // Try to list files in root folder to verify connection
        const response = await drive.files.get({
            fileId: ROOT_FOLDER_ID,
            fields: 'id, name',
        });

        if (response.data.id) {
            logger.info(`Google Drive connected: Root folder "${response.data.name}"`);
            return { connected: true };
        }
        return { connected: false, error: 'Root folder ID valid but folder not found or accessible' };
    } catch (error: any) {
        logger.error('Google Drive connection check failed:', error);
        return { connected: false, error: error.message || 'Unknown error' };
    }
}

export default {
    createFolder,
    findFolderByName,
    getOrCreateEmployeesFolder,
    getOrCreateInternsFolder,
    getOrCreateEmployeeFolder,
    getOrCreateWeekFolder,
    uploadFile,
    downloadFile,
    deleteFile,
    listFilesInFolder,
    getFileMetadata,
    createEmployeeSubfolders,
    checkDriveConnection,
};
