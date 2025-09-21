import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Fallback page generation when API is not available
function generateFallbackPage(prompt: string, projectName: string) {
  const words = prompt.split(' ').filter((word: string) => /^[a-zA-Z]+$/.test(word)).slice(0, 2);
  const pageName = words.length > 0 ? words.join('') + 'Page' : 'GeneratedPage';
  
  const jsonResponse = {
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
  
  return NextResponse.json(jsonResponse);
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, projectName } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not available, using fallback page generation');
      return generateFallbackPage(prompt, projectName);
    }

    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch (error) {
      console.warn('Failed to initialize Gemini model, using fallback:', error);
      return generateFallbackPage(prompt, projectName);
    }

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

    let result;
    try {
      result = await model.generateContent(enhancedPrompt);
    } catch (error) {
      console.warn('Gemini API call failed, using fallback:', error);
      return generateFallbackPage(prompt, projectName);
    }

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
      return generateFallbackPage(prompt, projectName);
    }

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error generating page:', error);
    // Even on error, return a fallback page instead of 500
    const { prompt, projectName } = await request.json().catch(() => ({ prompt: 'Error Page', projectName: 'Unknown' }));
    return generateFallbackPage(prompt || 'Error Page', projectName || 'Unknown');
  }
}