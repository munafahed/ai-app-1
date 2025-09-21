import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');\n\n// Fallback page generation when API is not available\nfunction generateFallbackPage(prompt: string, projectName: string) {\n  const words = prompt.split(' ').filter((word: string) => /^[a-zA-Z]+$/.test(word)).slice(0, 2);\n  const pageName = words.length > 0 ? words.join('') + 'Page' : 'GeneratedPage';\n  \n  const jsonResponse = {\n    pageName,\n    dartCode: `import 'package:flutter/material.dart';\n\nclass ${pageName} extends StatefulWidget {\n  const ${pageName}({Key? key}) : super(key: key);\n\n  @override\n  State<${pageName}> createState() => _${pageName}State();\n}\n\nclass _${pageName}State extends State<${pageName}> {\n  @override\n  Widget build(BuildContext context) {\n    return Scaffold(\n      appBar: AppBar(\n        title: const Text('${pageName}'),\n        backgroundColor: Theme.of(context).colorScheme.inversePrimary,\n      ),\n      body: Center(\n        child: Padding(\n          padding: const EdgeInsets.all(16.0),\n          child: Column(\n            mainAxisAlignment: MainAxisAlignment.center,\n            children: [\n              Icon(\n                Icons.flutter_dash,\n                size: 80,\n                color: Theme.of(context).colorScheme.primary,\n              ),\n              const SizedBox(height: 20),\n              Text(\n                '${pageName}',\n                style: Theme.of(context).textTheme.headlineMedium,\n              ),\n              const SizedBox(height: 16),\n              Text(\n                'Generated from prompt: ${prompt}',\n                style: Theme.of(context).textTheme.bodyLarge,\n                textAlign: TextAlign.center,\n              ),\n            ],\n          ),\n        ),\n      ),\n    );\n  }\n}`,\n    uiDescription: `A ${pageName.toLowerCase()} with Flutter logo, title, and description based on the prompt: ${prompt}`,\n    widgets: ['Scaffold', 'AppBar', 'Center', 'Padding', 'Column', 'Icon', 'Text', 'SizedBox'],\n    models: []\n  };\n  \n  return NextResponse.json(jsonResponse);\n}

export async function POST(request: NextRequest) {
  try {
    const { prompt, projectName } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const enhancedPrompt = `
Generate a complete Flutter page based on this description: "${prompt}"

For project: ${projectName}

Requirements:
1. Generate complete, functional Dart code for a Flutter page
2. Use modern Flutter practices and Material 3 design
3. Include proper imports and class structure
4. Provide a clear UI description
5. List all Flutter widgets used
6. Include any necessary models or data structures
7. Make it production-ready code

Respond in this exact JSON format:
{
  "pageName": "string (short descriptive name)",
  "dartCode": "string (complete Flutter page code)",
  "uiDescription": "string (description of the UI and functionality)",
  "widgets": ["array of Flutter widget names used"],
  "models": ["array of any data models needed"]
}

Make sure the Dart code is complete, properly formatted, and follows Flutter best practices.`;

    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON from the response
    let jsonResponse;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      jsonResponse = JSON.parse(jsonText);
      
      // Validate required fields
      if (!jsonResponse.pageName || !jsonResponse.dartCode) {
        throw new Error('Missing required fields');
      }
      
      // Sanitize page name for valid class names
      const sanitizedPageName = jsonResponse.pageName.replace(/[^a-zA-Z0-9]/g, '');
      jsonResponse.pageName = sanitizedPageName || 'GeneratedPage';
      
    } catch (parseError) {
      console.log('JSON parsing failed, using fallback:', parseError);
      // If parsing fails, create a fallback response
      const words = prompt.split(' ').filter((word: string) => /^[a-zA-Z]+$/.test(word)).slice(0, 2);
      const pageName = words.length > 0 ? words.join('') + 'Page' : 'GeneratedPage';
      
      jsonResponse = {
        pageName,
        dartCode: `import 'package:flutter/material.dart';

class ${pageName} extends StatefulWidget {
  const ${pageName}({Key? key}) : super(key: key);

  @override
  State<${pageName}> createState() => _${pageName}State();
}

class _${pageName}State extends State<${pageName}> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('${pageName}'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.flutter_dash,
                size: 80,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 20),
              Text(
                '${pageName}',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 16),
              Text(
                'Generated from prompt: ${prompt}',
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}`,
        uiDescription: `A ${pageName.toLowerCase()} with Flutter logo, title, and description based on the prompt: ${prompt}`,
        widgets: ['Scaffold', 'AppBar', 'Center', 'Padding', 'Column', 'Icon', 'Text', 'SizedBox'],
        models: []
      };
    }

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error generating page:', error);
    return NextResponse.json(
      { error: 'Failed to generate page' },
      { status: 500 }
    );
  }
}