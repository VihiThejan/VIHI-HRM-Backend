
// @ts-nocheck
async function test() {
    try {
        const STAFF_ID = 'INT1735944987910';
        const PASSWORD = 'password123';

        console.log(`1. Logging in as Intern (${STAFF_ID})...`);
        const internLoginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId: STAFF_ID, password: PASSWORD })
        });

        if (!internLoginRes.ok) {
            const txt = await internLoginRes.text();
            throw new Error(`Intern Login failed: ${internLoginRes.status} ${txt}`);
        }
        const internData = await internLoginRes.json();
        const internToken = internData.token;
        console.log('   Intern Logged in. Token:', internToken ? 'Present' : 'Missing');

        console.log('2. Fetching Diary...');
        const diaryRes = await fetch('http://127.0.0.1:5000/api/diary/current-week', {
            headers: { Authorization: `Bearer ${internToken}` }
        });

        if (!diaryRes.ok) {
            const txt = await diaryRes.text();
            throw new Error(`Get Diary failed: ${diaryRes.status} ${txt}`);
        }

        const diaryData = await diaryRes.json();
        console.log('Diary Data:', JSON.stringify(diaryData, null, 2));
        const diaryId = diaryData._id;

        // If _id is missing, it might be that diary was JUST created and returned differently?
        // But per controller code, it returns the document.
        if (!diaryId) throw new Error('Diary ID not found in response');

        console.log(`   Diary ID: ${diaryId}`);

        console.log('3. Uploading File...');
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        const content = 'Test drive upload content (FINAL)';
        const body = `
--${boundary}
Content-Disposition: form-data; name="file"; filename="test_final.txt"
Content-Type: text/plain

${content}
--${boundary}--
`;

        const uploadRes = await fetch(`http://127.0.0.1:5000/api/diary/${diaryId}/submit-document`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${internToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body
        });

        if (!uploadRes.ok) {
            const txt = await uploadRes.text();
            throw new Error(`Upload failed: ${uploadRes.status} ${txt}`);
        }

        const uploadData = await uploadRes.json();
        console.log('   Upload Response:', JSON.stringify(uploadData, null, 2));

        if (uploadData.documentUrl && (uploadData.documentUrl.includes('drive.google.com') || uploadData.documentUrl.includes('googleusercontent'))) {
            console.log('SUCCESS: URL is from Google Drive: ' + uploadData.documentUrl);
        } else {
            console.log('FAILURE: URL is local or invalid: ' + uploadData.documentUrl);
        }

    } catch (error) {
        console.error('TEST FAILED:', error);
    }
}

test();
