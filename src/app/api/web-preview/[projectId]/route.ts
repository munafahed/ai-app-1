import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    
    // For now, redirect to a simple Flutter web preview
    // In a real implementation, this would build and serve the actual Flutter web app
    const previewHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Flutter Web Preview</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .flutter-logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: #02569B;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        h1 {
            color: #02569B;
            margin-bottom: 10px;
        }
        .preview-note {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #2196f3;
        }
        .btn {
            background: #02569B;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
        }
        .btn:hover {
            background: #0d47a1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="flutter-logo">F</div>
        <h1>Flutter Web Preview</h1>
        <p>Project ID: ${projectId}</p>
        
        <div class="preview-note">
            <h3>🚧 Preview Coming Soon</h3>
            <p>Your Flutter app is being prepared for web preview. In the full implementation, this would show your generated pages running in a Flutter web environment.</p>
            <p>For now, you can download the project ZIP file and run it locally with <code>flutter run -d chrome</code></p>
        </div>
        
        <button class="btn" onclick="window.close()">Close Preview</button>
        <button class="btn" onclick="window.opener && window.opener.focus(); window.close();">Back to Dashboard</button>
    </div>
</body>
</html>`;

    return new NextResponse(previewHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error serving web preview:', error);
    return NextResponse.json(
      { error: 'Failed to load web preview' },
      { status: 500 }
    );
  }
}