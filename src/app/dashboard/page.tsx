
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  FolderPlus, 
  Sparkles, 
  Eye, 
  Save, 
  RefreshCw, 
  Download, 
  Play, 
  Database, 
  Settings, 
  Code, 
  Smartphone,
  Folder,
  FileCode,
  Trash2,
  Edit3
} from "lucide-react";
import JSZip from "jszip";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  pages: FlutterPage[];
  backendConnected: boolean;
}

export interface FlutterPage {
  id: string;
  name: string;
  prompt: string;
  dartCode: string;
  uiDescription: string;
  widgets: string[];
  models: string[];
  preview?: string;
  createdAt: Date;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isGeneratingPage, setIsGeneratingPage] = useState(false);
  const [pagePrompt, setPagePrompt] = useState("");
  const [selectedPage, setSelectedPage] = useState<FlutterPage | null>(null);
  const [isConnectingBackend, setIsConnectingBackend] = useState(false);
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewPage, setPreviewPage] = useState<FlutterPage | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load projects from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProjects = localStorage.getItem('flutter-projects');
      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects);
        // Fix date parsing issues
        const fixedProjects = parsedProjects.map((project: any) => ({
          ...project,
          createdAt: new Date(project.createdAt),
          pages: project.pages.map((page: any) => ({
            ...page,
            createdAt: new Date(page.createdAt)
          }))
        }));
        setProjects(fixedProjects);
      }
    }
  }, []);

  // Save projects to localStorage whenever projects change
  useEffect(() => {
    if (typeof window !== 'undefined' && projects.length > 0) {
      localStorage.setItem('flutter-projects', JSON.stringify(projects));
    }
  }, [projects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Create a new project
  const createProject = async () => {
    if (!newProjectName.trim()) {
      toast({ title: "Error", description: "Project name is required", variant: "destructive" });
      return;
    }

    setIsCreatingProject(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate creation

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName,
      description: newProjectDescription,
      createdAt: new Date(),
      pages: [],
      backendConnected: false
    };

    setProjects(prev => [...prev, newProject]);
    setNewProjectName("");
    setNewProjectDescription("");
    setIsCreatingProject(false);
    setShowProjectDialog(false);
    
    toast({ title: "Success", description: "Project created successfully!" });
  };

  // Generate a new page using Gemini AI
  const generatePage = async () => {
    if (!pagePrompt.trim() || !selectedProject) {
      toast({ title: "Error", description: "Page prompt is required", variant: "destructive" });
      return;
    }

    setIsGeneratingPage(true);
    
    try {
      const response = await fetch('/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: pagePrompt,
          projectName: selectedProject.name 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate page');
      }

      const result = await response.json();
      
      const newPage: FlutterPage = {
        id: Date.now().toString(),
        name: result.pageName || 'Generated Page',
        prompt: pagePrompt,
        dartCode: result.dartCode,
        uiDescription: result.uiDescription,
        widgets: result.widgets || [],
        models: result.models || [],
        preview: result.preview,
        createdAt: new Date()
      };

      setProjects(prev => prev.map(project => 
        project.id === selectedProject.id 
          ? { ...project, pages: [...project.pages, newPage] }
          : project
      ));

      setSelectedPage(newPage);
      setPagePrompt("");
      setShowPageDialog(false);
      
      toast({ title: "Success", description: "Page generated successfully!" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate page", variant: "destructive" });
    } finally {
      setIsGeneratingPage(false);
    }
  };

  // Connect backend with Firebase
  const connectBackend = async () => {
    if (!selectedProject) return;

    setIsConnectingBackend(true);
    
    try {
      const response = await fetch('/api/connect-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: selectedProject.id,
          pages: selectedProject.pages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect backend');
      }

      setProjects(prev => prev.map(project => 
        project.id === selectedProject.id 
          ? { ...project, backendConnected: true }
          : project
      ));
      
      toast({ title: "Success", description: "Backend connected successfully!" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to connect backend", variant: "destructive" });
    } finally {
      setIsConnectingBackend(false);
    }
  };

  // Delete a page
  const deletePage = (pageId: string) => {
    if (!selectedProject) return;
    
    setProjects(prev => prev.map(project => 
      project.id === selectedProject.id 
        ? { ...project, pages: project.pages.filter(page => page.id !== pageId) }
        : project
    ));
    
    if (selectedPage?.id === pageId) {
      setSelectedPage(null);
    }
    
    toast({ title: "Success", description: "Page deleted successfully!" });
  };

  // Regenerate a page
  const regeneratePage = async (page: FlutterPage) => {
    setPagePrompt(page.prompt);
    setShowPageDialog(true);
  };

  // Preview page code
  const previewPageCode = (page: FlutterPage) => {
    setPreviewPage(page);
    setShowPreviewDialog(true);
  };

  // Open web preview
  const openWebPreview = () => {
    if (!selectedProject) return;
    window.open(`/api/web-preview/${selectedProject.id}`, '_blank');
  };

  // Download project as ZIP
  const downloadProject = async () => {
    if (!selectedProject) return;

    const zip = new JSZip();
    
    // Add project files
    zip.file('pubspec.yaml', generatePubspecYaml(selectedProject));
    zip.file('lib/main.dart', generateMainDart(selectedProject));
    
    // Add generated pages
    selectedProject.pages.forEach(page => {
      const fileName = `lib/pages/${page.name.toLowerCase().replace(/\s+/g, '_')}_page.dart`;
      zip.file(fileName, page.dartCode);
    });

    // Generate and download ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProject.name.toLowerCase().replace(/\s+/g, '_')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Success", description: "Project downloaded successfully!" });
  };

  // Helper functions
  const generatePubspecYaml = (project: Project) => {
    return `name: ${project.name.toLowerCase().replace(/\s+/g, '_')}
description: ${project.description}
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: ">=3.10.0"

dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^2.15.0
  firebase_auth: ^4.7.2
  cloud_firestore: ^4.8.4
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true`;
  };

  const generateMainDart = (project: Project) => {
    return `import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${project.name}',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${project.name}'),
      ),
      body: Center(
        child: Text(
          'Welcome to ${project.name}!',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
      ),
    );
  }
}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Genius APPio Dashboard</h1>
              <p className="text-muted-foreground">Build Flutter apps with AI</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {user.email}</span>
              <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Flutter Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="My Awesome App"
                      />
                    </div>
                    <div>
                      <Label htmlFor="projectDescription">Description</Label>
                      <Textarea
                        id="projectDescription"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="Describe your app..."
                      />
                    </div>
                    <Button 
                      onClick={createProject} 
                      disabled={isCreatingProject}
                      className="w-full"
                    >
                      {isCreatingProject ? (
                        <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                      ) : (
                        <><FolderPlus className="h-4 w-4 mr-2" /> Create Project</>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {!selectedProject ? (
          // Project Selection View
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Your Projects</h2>
              <p className="text-muted-foreground">Select a project to continue or create a new one</p>
            </div>
            
            {projects.length === 0 ? (
              <Card className="p-12 text-center">
                <Smartphone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">Create your first Flutter project to get started</p>
                <Button onClick={() => setShowProjectDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Card key={project.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <CardDescription>{project.description}</CardDescription>
                        </div>
                        <Badge variant={project.backendConnected ? "default" : "secondary"}>
                          {project.backendConnected ? "Connected" : "Frontend Only"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <span>{project.pages.length} pages</span>
                        <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                      <Button 
                        onClick={() => setSelectedProject(project)}
                        className="w-full"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Open Project
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Project Workspace View
          <div>
            {/* Project Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedProject(null)}
                >
                  ← Back to Projects
                </Button>
                <div>
                  <h2 className="text-xl font-semibold">{selectedProject.name}</h2>
                  <p className="text-muted-foreground">{selectedProject.description}</p>
                </div>
                <Badge variant={selectedProject.backendConnected ? "default" : "secondary"}>
                  {selectedProject.backendConnected ? "Backend Connected" : "Frontend Only"}
                </Badge>
              </div>
              <div className="flex gap-2">
                {!selectedProject.backendConnected && selectedProject.pages.length > 0 && (
                  <Button 
                    onClick={connectBackend}
                    disabled={isConnectingBackend}
                    variant="outline"
                  >
                    {isConnectingBackend ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                    ) : (
                      <><Database className="h-4 w-4 mr-2" /> Connect Backend</>
                    )}
                  </Button>
                )}
                {selectedProject.pages.length > 0 && (
                  <>
                    <Button onClick={downloadProject} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download ZIP
                    </Button>
                    <Button onClick={openWebPreview}>
                      <Play className="h-4 w-4 mr-2" />
                      Web Preview
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pages List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Pages ({selectedProject.pages.length})</CardTitle>
                        <CardDescription>AI-generated Flutter pages for your app</CardDescription>
                      </div>
                      <Dialog open={showPageDialog} onOpenChange={setShowPageDialog}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Page
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Generate New Page with AI</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="pagePrompt">Page Description</Label>
                              <Textarea
                                id="pagePrompt"
                                value={pagePrompt}
                                onChange={(e) => setPagePrompt(e.target.value)}
                                placeholder="e.g., 'Splash Page with app logo and loading animation' or 'Login page with email and password fields'"
                                rows={4}
                              />
                            </div>
                            <Button 
                              onClick={generatePage} 
                              disabled={isGeneratingPage}
                              className="w-full"
                            >
                              {isGeneratingPage ? (
                                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                              ) : (
                                <><Sparkles className="h-4 w-4 mr-2" /> Generate Page</>
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedProject.pages.length === 0 ? (
                      <div className="text-center py-12">
                        <Code className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No pages yet</h3>
                        <p className="text-muted-foreground mb-4">Use AI to generate your first Flutter page</p>
                        <Button onClick={() => setShowPageDialog(true)}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate First Page
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedProject.pages.map((page) => (
                          <Card key={page.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedPage(page)}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold">{page.name}</h4>
                                  <p className="text-sm text-muted-foreground mb-2">{page.prompt}</p>
                                  <div className="flex gap-2">
                                    {page.widgets.slice(0, 3).map((widget, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {widget}
                                      </Badge>
                                    ))}
                                    {page.widgets.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{page.widgets.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => previewPageCode(page)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => deletePage(page.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Page Preview/Details */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle>{selectedPage ? 'Page Details' : 'Project Structure'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPage ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">{selectedPage.name}</h4>
                          <p className="text-sm text-muted-foreground">{selectedPage.uiDescription}</p>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h5 className="font-medium mb-2">Widgets Used</h5>
                          <div className="flex flex-wrap gap-1">
                            {selectedPage.widgets.map((widget, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {widget}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {selectedPage.models.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2">Models</h5>
                            <div className="flex flex-wrap gap-1">
                              {selectedPage.models.map((model, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {model}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => regeneratePage(selectedPage)}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Regenerate
                          </Button>
                          <Button size="sm" className="flex-1" onClick={() => previewPageCode(selectedPage)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          <span className="font-medium">{selectedProject.name}</span>
                        </div>
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <FileCode className="h-4 w-4" />
                            <span>lib/main.dart</span>
                          </div>
                          {selectedProject.pages.map((page) => (
                            <div key={page.id} className="flex items-center gap-2 text-sm">
                              <FileCode className="h-4 w-4" />
                              <span>lib/pages/{page.name.toLowerCase().replace(/\s+/g, '_')}_page.dart</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Code Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{previewPage?.name} - Dart Code</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
              <code>{previewPage?.dartCode}</code>
            </pre>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Generated from: {previewPage?.prompt}
            </div>
            <Button onClick={() => regeneratePage(previewPage!)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
