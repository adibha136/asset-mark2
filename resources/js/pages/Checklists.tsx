import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ChevronRight,
  ListTodo,
  GripVertical,
  Type,
  CheckSquare,
  List,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal, ConfirmModal } from "@/components/shared/Modal";

interface Question {
  id?: number;
  question_text: string;
  question_type: string;
  options: string[] | null;
  order: number;
}

interface Template {
  id?: number;
  name: string;
  description: string;
  questions: Question[];
}

interface Assignment {
  id: number;
  tenant_id: string;
  template_id: number;
  trigger_status: string;
  template?: Template;
  tenant?: Tenant;
}

interface Tenant {
  id: string;
  name: string;
}

export default function Checklists() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState("templates");

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number, type: 'template' | 'assignment' } | null>(null);

  // Assignment State
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    tenant_id: "",
    template_id: "",
    trigger_status: "new_user"
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isAssignmentModalOpen) {
      fetchTenants();
    }
  }, [isAssignmentModalOpen]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchTemplates(), fetchAssignments()]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await api.get("/checklist-templates");
      setTemplates(response.data);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      toast.error("Failed to load checklist templates");
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await api.get("/checklist-assignments");
      setAssignments(response.data);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await api.get("/tenants");
      setTenants(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate({
      name: "",
      description: "",
      questions: []
    });
  };

  const handleAddQuestion = () => {
    if (!editingTemplate) return;
    const newQuestion: Question = {
      question_text: "",
      question_type: "text",
      options: null,
      order: editingTemplate.questions.length
    };
    setEditingTemplate({
      ...editingTemplate,
      questions: [...editingTemplate.questions, newQuestion]
    });
  };

  const handleRemoveQuestion = (index: number) => {
    if (!editingTemplate) return;
    const newQuestions = [...editingTemplate.questions];
    newQuestions.splice(index, 1);
    // Re-order
    const reordered = newQuestions.map((q, i) => ({ ...q, order: i }));
    setEditingTemplate({ ...editingTemplate, questions: reordered });
  };

  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    if (!editingTemplate) return;
    const newQuestions = [...editingTemplate.questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setEditingTemplate({ ...editingTemplate, questions: newQuestions });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name) {
      toast.error("Template name is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate.id) {
        await api.put(`/checklist-templates/${editingTemplate.id}`, editingTemplate);
        toast.success("Template updated successfully");
      } else {
        await api.post("/checklist-templates", editingTemplate);
        toast.success("Template created successfully");
      }
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = (id: number) => {
    setItemToDelete({ id, type: 'template' });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const { id, type } = itemToDelete;
    setIsSaving(true);
    try {
      if (type === 'template') {
        await api.delete(`/checklist-templates/${id}`);
        toast.success("Template deleted successfully");
        fetchTemplates();
      } else {
        await api.delete(`/checklist-assignments/${id}`);
        toast.success("Assignment deleted");
        fetchAssignments();
      }
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
      toast.error(`Failed to delete ${type}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignTemplate = async () => {
    if (!newAssignment.tenant_id || !newAssignment.template_id) {
      toast.error("Please select a tenant and template");
      return;
    }
    try {
      await api.post("/checklist-assignments", newAssignment);
      toast.success("Assignment created successfully");
      setIsAssignmentModalOpen(false);
      fetchAssignments();
      setNewAssignment({ tenant_id: "", template_id: "", trigger_status: "new_user" });
    } catch (error) {
      toast.error("Failed to create assignment");
    }
  }

  const handleDeleteAssignment = (id: number) => {
    setItemToDelete({ id, type: 'assignment' });
    setIsDeleteModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between opacity-0 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklist Management</h1>
          <p className="text-muted-foreground">Manage dynamic checklists and assignments</p>
        </div>
        <div className="flex gap-2">
          {!editingTemplate && (
            <>
              <Button variant="outline" onClick={() => setIsAssignmentModalOpen(true)} className="gap-2">
                <Building2 className="w-4 h-4" />
                Assign to Tenant
              </Button>
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            </>
          )}
        </div>
      </div>

      {editingTemplate ? (
        <Card className="opacity-0 animate-fade-in">
          {/* ... (Existing Editing Logic) ... */}
          {/* To save tokens, I'm rewriting this part but ensuring the logic is preserved. */}
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{editingTemplate.id ? "Edit Template" : "New Template"}</CardTitle>
                <CardDescription>Define the name and questions for this checklist</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Onboarding Checklist"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="What is this checklist for?"
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-primary" />
                  Questions
                </h3>
                <Button variant="outline" size="sm" onClick={handleAddQuestion} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Question
                </Button>
              </div>

              <div className="space-y-4">
                {editingTemplate.questions.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                    No questions added yet. Click "Add Question" to start building your checklist.
                  </div>
                )}
                {editingTemplate.questions.map((question, index) => (
                  <Card key={index} className="bg-muted/30">
                    <CardContent className="p-4 flex gap-4">
                      <div className="pt-2">
                        <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                      </div>
                      <div className="flex-1 grid gap-4 md:grid-cols-12">
                        <div className="md:col-span-6 space-y-2">
                          <Label>Question Text</Label>
                          <Input
                            placeholder="Enter question..."
                            value={question.question_text}
                            onChange={(e) => handleUpdateQuestion(index, { question_text: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-3 space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={question.question_type}
                            onValueChange={(val) => handleUpdateQuestion(index, { question_type: val })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text Input</SelectItem>
                              <SelectItem value="yes_no">Yes/No</SelectItem>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 flex items-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleRemoveQuestion(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                    {question.question_type === 'multiple_choice' && (
                      <CardContent className="px-14 pb-4 pt-0">
                        <div className="space-y-2">
                          <Label className="text-xs">Options (comma separated)</Label>
                          <Input
                            placeholder="Option 1, Option 2, Option 3"
                            value={question.options?.join(", ") || ""}
                            onChange={(e) => handleUpdateQuestion(index, {
                              options: e.target.value.split(",").map(s => s.trim()).filter(s => s !== "")
                            })}
                          />
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-center p-6 bg-card rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-4 sm:gap-8">
              <div
                className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ${activeTab === 'templates' ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'}`}
                onClick={() => setActiveTab('templates')}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-all duration-300 ${activeTab === 'templates' ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 ring-4 ring-primary/10' : 'bg-background border-border'}`}>
                  1
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-sm font-bold leading-none uppercase tracking-wider">Templates</span>
                  <span className="text-[10px] mt-1 opacity-70">Design checklists</span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-40">
                <div className={`h-[2px] w-8 sm:w-16 rounded-full transition-colors duration-500 ${activeTab === 'assignments' ? 'bg-primary' : 'bg-border'}`} />
                <ChevronRight className={`w-4 h-4 transition-colors duration-500 ${activeTab === 'assignments' ? 'text-primary' : 'text-border'}`} />
              </div>

              <div
                className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ${activeTab === 'assignments' ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'}`}
                onClick={() => setActiveTab('assignments')}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-all duration-300 ${activeTab === 'assignments' ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 ring-4 ring-primary/10' : 'bg-background border-border'}`}>
                  2
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-sm font-bold leading-none uppercase tracking-wider">Assignments</span>
                  <span className="text-[10px] mt-1 opacity-70">Assign to tenants</span>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="assignments">Active Assignments</TabsTrigger>
            </TabsList>
            <TabsContent value="templates" className="mt-0">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {templates.length === 0 && (
                <div className="col-span-full text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No templates yet</h3>
                  <p className="text-muted-foreground mb-6">Create your first checklist template to get started</p>
                  <Button onClick={handleCreateNew}>Create First Template</Button>
                </div>
              )}
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                        <ClipboardCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTemplate(template.id!)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description || "No description provided"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <ListTodo className="w-4 h-4" />
                        {template.questions.length} questions
                      </div>
                      <div className="flex gap-1">
                        {Array.from(new Set(template.questions.map(q => q.question_type))).map(type => (
                          <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {type === 'yes_no' ? 'Y/N' : type === 'multiple_choice' ? 'Multi' : 'Text'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardContent className="pt-0 border-t border-border mt-2 group-hover:bg-muted/30 transition-colors">
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-10 text-xs font-medium"
                      onClick={() => setEditingTemplate(template)}
                    >
                      Edit Template
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="assignments" className="mt-4">
            {assignments.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No active assignments</h3>
                <p className="mb-4">Assign a checklist template to a tenant to get started.</p>
                <Button variant="outline" onClick={() => setIsAssignmentModalOpen(true)}>Assign to Tenant</Button>
              </div>
            ) : (
              <div className="border rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground font-medium border-b">
                    <tr>
                      <th className="p-3">Tenant</th>
                      <th className="p-3">Trigger Condition</th>
                      <th className="p-3">Assigned Template</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(assignment => (
                      <tr key={assignment.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3 font-medium">{assignment.tenant?.name || "Unknown Tenant"}</td>
                        <td className="p-3">
                          <Badge variant="outline">{assignment.trigger_status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="p-3">{assignment.template?.name || "Unknown Template"}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-8 w-8 p-0"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      )}

      {/* Assignment Modal */}
      <Modal
        open={isAssignmentModalOpen}
        onOpenChange={setIsAssignmentModalOpen}
        title="Assign Template to Tenant"
        description="Select a tenant and a condition to trigger this checklist."
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsAssignmentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignTemplate}>Assign Template</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tenant</Label>
            <Select
              value={newAssignment.tenant_id}
              onValueChange={(val) => setNewAssignment({ ...newAssignment, tenant_id: val })}
            >
              <SelectTrigger><SelectValue placeholder="Select Tenant" /></SelectTrigger>
              <SelectContent>
                {tenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trigger Status</Label>
            <Select
              value={newAssignment.trigger_status}
              onValueChange={(val) => setNewAssignment({ ...newAssignment, trigger_status: val })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new_user">New User</SelectItem>
                <SelectItem value="inactive">Inactive User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template</Label>
            <Select
              value={String(newAssignment.template_id)}
              onValueChange={(val) => setNewAssignment({ ...newAssignment, template_id: val })}
            >
              <SelectTrigger><SelectValue placeholder="Select Template" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title={itemToDelete?.type === 'template' ? 'Delete Template' : 'Delete Assignment'}
        description={`Are you sure you want to delete this ${itemToDelete?.type}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        variant="destructive"
        isLoading={isSaving}
      />

    </div>
  );
}