<?php

namespace App\Http\Controllers;

use App\Models\ChecklistQuestion;
use App\Models\ChecklistTemplate;
use Illuminate\Http\Request;

class ChecklistController extends Controller
{
    public function index()
    {
        return response()->json(ChecklistTemplate::with('questions')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'nullable|array',
            'questions.*.question_text' => 'required|string',
            'questions.*.question_type' => 'required|string',
            'questions.*.options' => 'nullable|array',
            'questions.*.order' => 'integer',
        ]);

        $template = ChecklistTemplate::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        if (! empty($validated['questions'])) {
            foreach ($validated['questions'] as $question) {
                $template->questions()->create($question);
            }
        }

        return response()->json($template->load('questions'));
    }

    public function update(Request $request, ChecklistTemplate $template)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'nullable|array',
            'questions.*.id' => 'nullable|integer',
            'questions.*.question_text' => 'required|string',
            'questions.*.question_type' => 'required|string',
            'questions.*.options' => 'nullable|array',
            'questions.*.order' => 'integer',
        ]);

        $template->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        // Simple approach: delete old questions and create new ones or update
        // For simplicity in this dynamic UI, we might just sync them
        $existingQuestionIds = collect($validated['questions'] ?? [])->pluck('id')->filter()->toArray();
        $template->questions()->whereNotIn('id', $existingQuestionIds)->delete();

        foreach ($validated['questions'] ?? [] as $questionData) {
            if (isset($questionData['id'])) {
                ChecklistQuestion::where('id', $questionData['id'])->update([
                    'question_text' => $questionData['question_text'],
                    'question_type' => $questionData['question_type'],
                    'options' => $questionData['options'] ?? null,
                    'order' => $questionData['order'] ?? 0,
                ]);
            } else {
                $template->questions()->create($questionData);
            }
        }

        return response()->json($template->load('questions'));
    }

    public function destroy(ChecklistTemplate $template)
    {
        $template->delete();

        return response()->json(['message' => 'Template deleted successfully']);
    }

    // --- Assignment Logic ---

    public function assignTemplate(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
            'template_id' => 'required|exists:checklist_templates,id',
            'trigger_status' => 'required|string',
        ]);

        $assignment = \App\Models\ChecklistAssignment::updateOrCreate(
            [
                'tenant_id' => $validated['tenant_id'],
                'trigger_status' => $validated['trigger_status'],
            ],
            [
                'template_id' => $validated['template_id'],
            ]
        );

        return response()->json($assignment);
    }

    public function getAssignments(Request $request)
    {
        $query = \App\Models\ChecklistAssignment::with(['template', 'tenant']);

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->query('tenant_id'));
        }

        return response()->json($query->get());
    }

    public function destroyAssignment($id)
    {
        $assignment = \App\Models\ChecklistAssignment::findOrFail($id);
        $assignment->delete(); // This handles cascade delete of submissions if defined in DB

        return response()->json(['message' => 'Assignment deleted successfully']);
    }

    // --- Submission & Execution Logic ---

    public function getSubmission(Request $request, \App\Services\ChecklistService $checklistService)
    {
        $request->validate(['user_id' => 'required|uuid|exists:directory_users,id']);
        $userId = $request->query('user_id');
        $user = \App\Models\DirectoryUser::findOrFail($userId);

        // Ensure submissions exist
        $checklistService->ensureSubmissions($user);

        $submissions = \App\Models\ChecklistSubmission::where('directory_user_id', $userId)
            ->with(['assignment.template.questions', 'answers', 'logs'])
            ->get();

        return response()->json($submissions);
    }

    public function submitAnswer(Request $request)
    {
        $validated = $request->validate([
            'submission_id' => 'required|exists:checklist_submissions,id',
            'question_id' => 'required|exists:checklist_questions,id',
            'answer_value' => 'nullable|string',
            'user_name' => 'required|string', // Admin/User who is filling it
        ]);

        $submission = \App\Models\ChecklistSubmission::with(['assignment.template.questions'])->findOrFail($validated['submission_id']);

        // 1. Validate Sequence
        $questions = $submission->assignment->template->questions->sortBy('order')->values();
        $targetQuestionIndex = $questions->search(function ($q) use ($validated) {
            return $q->id == $validated['question_id'];
        });

        if ($targetQuestionIndex > 0) {
            $prevQuestion = $questions[$targetQuestionIndex - 1];
            // Check if prev question is answered in DB
            $prevAnswer = \App\Models\ChecklistAnswer::where('submission_id', $submission->id)
                ->where('question_id', $prevQuestion->id)
                ->whereNotNull('answer_value') // Assuming non-null means answered
                ->exists();

            if (! $prevAnswer) {
                return response()->json(['error' => 'You must complete the previous question first.'], 403);
            }
        }

        // 2. Save/Update Answer
        $answer = \App\Models\ChecklistAnswer::updateOrCreate(
            [
                'submission_id' => $submission->id,
                'question_id' => $validated['question_id'],
            ],
            [
                'answer_value' => $validated['answer_value'],
            ]
        );

        // 3. Log Activity
        \App\Models\ChecklistLog::create([
            'submission_id' => $submission->id,
            'question_id' => $validated['question_id'],
            'user_name' => $validated['user_name'],
            'message' => $validated['answer_value'] ? "Answered: {$validated['answer_value']}" : 'Cleared answer',
            'action_type' => $answer->wasRecentlyCreated ? 'answered' : 'updated',
        ]);

        // 4. Check Completion Status
        $questions = $submission->assignment->template->questions;
        $totalQuestions = $questions->count();
        $questionIds = $questions->pluck('id')->toArray();

        $answeredCount = \App\Models\ChecklistAnswer::where('submission_id', $submission->id)
            ->whereIn('question_id', $questionIds)
            ->whereNotNull('answer_value')
            ->where('answer_value', '!=', '')
            ->count();

        if ($answeredCount >= $totalQuestions) {
            $submission->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        } else {
            $submission->update([
                'status' => 'in_progress',
                'completed_at' => null,
            ]);
        }

        return response()->json($answer);
    }
}
