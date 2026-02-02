import { useState, useEffect } from "react";
import { Modal } from "@/components/shared/Modal";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, History, AlertCircle, ChevronRight, ClipboardCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ChecklistFillModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
}

interface Question {
    id: number;
    question_text: string;
    question_type: string;
    options: string[] | null;
    order: number;
}

interface Answer {
    id: number;
    question_id: number;
    answer_value: string;
    updated_at: string;
}

interface Log {
    id: number;
    question_id: number;
    user_name: string;
    message: string;
    action_type: string;
    created_at: string;
}

interface Assignment {
    template: {
        name: string;
        description: string;
        questions: Question[];
    }
}

interface Submission {
    id: number;
    status: string;
    assignment: Assignment;
    answers: Answer[];
    logs: Log[];
}

export function ChecklistFillModal({ open, onOpenChange, userId }: ChecklistFillModalProps) {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [answering, setAnswering] = useState<number | null>(null); // question_id currently being saved

    useEffect(() => {
        if (open && userId) {
            fetchSubmissions();
        }
    }, [open, userId]);

    const fetchSubmissions = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/checklist-submissions?user_id=${userId}`);
            setSubmissions(response.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load checklists");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerChange = async (submissionId: number, questionId: number, value: string) => {
        // This could be debounced or onBlur. For simplicity, let's use a "Save" button or onBlur.
        // But since UI needs to update "disabled" state of next question immediately, maybe separate state?
        // Let's implement immediate save on "Save" button for text, and onChange for selects.
    };

    const submitAnswer = async (submissionId: number, questionId: number, value: string) => {
        setAnswering(questionId);
        try {
            await api.post("/checklist-submissions/answer", {
                submission_id: submissionId,
                question_id: questionId,
                answer_value: value,
                user_name: "Current Admin" // In real app, get from auth context
            });
            // Refresh to get updated logs and answers
            await fetchSubmissions();
            toast.success("Saved");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to save answer");
        } finally {
            setAnswering(null);
        }
    };

    // Helper to check if question is enabled
    const isQuestionEnabled = (questions: Question[], currentIndex: number, answers: Answer[]) => {
        if (currentIndex === 0) return true;
        const prevQ = questions[currentIndex - 1];
        const prevAnswer = answers.find(a => a.question_id === prevQ.id);
        return !!prevAnswer?.answer_value; // Enabled if prev has value
    };

    if (isLoading) {
        return (
            <Modal open={open} onOpenChange={onOpenChange} title="Checklists" size="lg">
                <div className="flex items-center justify-center p-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="User Checklists"
            description="Manage onboarding and compliance checklists"
            size="xl"
        >
            <div className="space-y-8">
                <div className="flex items-center justify-center p-6 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex items-center gap-4 sm:gap-8">
                        <div className="flex items-center gap-3 text-primary">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base bg-primary border-2 border-primary text-primary-foreground shadow-lg shadow-primary/20 ring-4 ring-primary/10">
                                1
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold leading-none uppercase tracking-wider">Assigned</span>
                                <span className="text-[9px] mt-1 opacity-70">Checklist created</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-40">
                            <div className="h-[1px] w-6 sm:w-12 rounded-full bg-primary" />
                            <ChevronRight className="w-3 h-3 text-primary" />
                        </div>

                        <div className="flex items-center gap-3 text-muted-foreground">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base bg-background border-2 border-border">
                                2
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold leading-none uppercase tracking-wider">Completion</span>
                                <span className="text-[9px] mt-1 opacity-70">Fill answers</span>
                            </div>
                        </div>
                    </div>
                </div>

                {submissions.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">No active checklists found for this user.</div>
                )}

                {submissions.map((submission) => {
                    const questions = [...(submission.assignment?.template?.questions || [])].sort((a, b) => a.order - b.order);

                    return (
                        <div key={submission.id} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold">{submission.assignment.template.name}</h3>
                                    <p className="text-sm text-muted-foreground">{submission.assignment.template.description}</p>
                                </div>
                                <Badge variant={submission.status === 'completed' ? 'success' : 'secondary'}>
                                    {submission.status.replace('_', ' ')}
                                </Badge>
                            </div>

                            <div className="space-y-6 pl-2 border-l-2 border-border ml-2">
                                {questions.map((q, idx) => {
                                    const answer = submission.answers.find(a => a.question_id === q.id);
                                    const enabled = isQuestionEnabled(questions, idx, submission.answers);
                                    const logs = submission.logs.filter(l => l.question_id === q.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                                    return (
                                        <div key={q.id} className={`relative pb-6 ${!enabled ? 'opacity-50 grayscale' : ''}`}>
                                            {/* Timeline dot */}
                                            <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 ${answer ? 'bg-primary border-primary' : (enabled ? 'bg-background border-primary' : 'bg-muted border-muted-foreground')} flex items-center justify-center`}>
                                                {answer && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex flex-col gap-1">
                                                    <Label className="text-base">{idx + 1}. {q.question_text}</Label>
                                                    {/* Input Area */}
                                                    <div className="flex gap-2 max-w-xl">
                                                        {q.question_type === 'text' && (
                                                            <div className="flex-1 flex gap-2">
                                                                <Input
                                                                    defaultValue={answer?.answer_value || ""}
                                                                    disabled={!enabled}
                                                                    onBlur={(e) => {
                                                                        if (e.target.value !== (answer?.answer_value || "")) {
                                                                            submitAnswer(submission.id, q.id, e.target.value);
                                                                        }
                                                                    }}
                                                                    className="bg-background"
                                                                />
                                                            </div>
                                                        )}
                                                        {q.question_type === 'yes_no' && (
                                                            <div className="flex gap-2">
                                                                {['Yes', 'No'].map(opt => (
                                                                    <Button
                                                                        key={opt}
                                                                        size="sm"
                                                                        variant={answer?.answer_value === opt ? 'default' : 'outline'}
                                                                        disabled={!enabled}
                                                                        onClick={() => submitAnswer(submission.id, q.id, opt)}
                                                                    >
                                                                        {opt}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {q.question_type === 'multiple_choice' && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {q.options?.map(opt => (
                                                                    <Button
                                                                        key={opt}
                                                                        size="sm"
                                                                        variant={answer?.answer_value === opt ? 'default' : 'outline'}
                                                                        disabled={!enabled}
                                                                        onClick={() => submitAnswer(submission.id, q.id, opt)}
                                                                    >
                                                                        {opt}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Logs */}
                                                {logs.length > 0 && (
                                                    <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-2 max-w-xl">
                                                        <h4 className="flex items-center gap-1 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                                            <History className="w-3 h-3" /> History
                                                        </h4>
                                                        {logs.map(log => (
                                                            <div key={log.id} className="flex gap-2 text-xs">
                                                                <span className="font-semibold text-foreground">{log.user_name}</span>
                                                                <span className="text-muted-foreground">{log.message}</span>
                                                                <span className="ml-auto text-[10px] text-muted-foreground opacity-70">
                                                                    {new Date(log.created_at).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}
