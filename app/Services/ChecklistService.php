<?php

namespace App\Services;

use App\Models\ChecklistAssignment;
use App\Models\ChecklistSubmission;
use App\Models\DirectoryUser;

class ChecklistService
{
    /**
     * Ensure a user has the appropriate checklist submissions based on their status and tenant assignments.
     */
    public function ensureSubmissions(DirectoryUser $user)
    {
        $submissions = $user->checklistSubmissions ?? collect();

        // 1. Always ensure 'inactive' checklists if user is disabled
        if (! $user->account_enabled) {
            $hasInactive = $submissions->contains(fn ($s) => $s->assignment && $s->assignment->trigger_status === 'inactive');
            if (! $hasInactive) {
                $this->assignByTrigger($user, 'inactive');
            }
        }

        // 2. Ensure 'new_user' checklists
        $hasAnyOnboarding = $submissions->contains(fn ($s) => $s->assignment && $s->assignment->trigger_status === 'new_user');

        if ($user->account_enabled) {
            if ($submissions->isEmpty()) {
                $this->assignByTrigger($user, 'new_user');
            }
        } else {
            // For inactive users, we want to make sure they have the onboarding count too if it exists for the tenant
            if (! $hasAnyOnboarding) {
                $this->assignByTrigger($user, 'new_user');
            }
        }
    }

    private function assignByTrigger(DirectoryUser $user, string $triggerStatus)
    {
        $assignments = ChecklistAssignment::where('tenant_id', $user->tenant_id)
            ->where('trigger_status', $triggerStatus)
            ->get();

        foreach ($assignments as $assignment) {
            $existing = ChecklistSubmission::where('directory_user_id', $user->id)
                ->where('assignment_id', $assignment->id)
                ->exists();

            if (! $existing) {
                ChecklistSubmission::create([
                    'assignment_id' => $assignment->id,
                    'directory_user_id' => $user->id,
                    'status' => 'in_progress',
                ]);
            }
        }
    }

    public function getQuestionCounts(DirectoryUser $user)
    {
        $totalQuestions = 0;
        $answeredQuestions = 0;
        $onboardingTotal = 0;
        $onboardingAnswered = 0;
        $inactiveTotal = 0;
        $inactiveAnswered = 0;

        foreach ($user->checklistSubmissions as $submission) {
            // Safety check for deleted assignments or templates
            if (! $submission->assignment || ! $submission->assignment->template) {
                continue;
            }

            // Total questions in this assignment
            $questions = $submission->assignment->template->questions;
            $qCount = (int) $questions->count();
            $totalQuestions += $qCount;

            // Answered in this submission - ONLY count answers for questions that exist in the current template
            $questionIds = $questions->pluck('id')->toArray();
            $aCount = (int) $submission->answers
                ->filter(fn ($answer) => 
                    ! is_null($answer->answer_value) && 
                    $answer->answer_value !== '' && 
                    in_array($answer->question_id, $questionIds)
                )
                ->unique('question_id')
                ->count();
            $answeredQuestions += $aCount;

            // Split by trigger status
            $triggerStatus = $submission->assignment->trigger_status;
            if ($triggerStatus === 'new_user') {
                $onboardingTotal += $qCount;
                $onboardingAnswered += $aCount;
            } elseif ($triggerStatus === 'inactive') {
                $inactiveTotal += $qCount;
                $inactiveAnswered += $aCount;
            }
        }

        return [
            'total_questions_count' => (int) $totalQuestions,
            'completed_questions_count' => (int) $answeredQuestions,
            'onboarding_total_questions' => (int) $onboardingTotal,
            'onboarding_completed_questions' => (int) $onboardingAnswered,
            'inactive_total_questions' => (int) $inactiveTotal,
            'inactive_completed_questions' => (int) $inactiveAnswered,
            'pending_checklists_count' => (int) $user->checklistSubmissions->where('status', 'in_progress')->count(),
        ];
    }
}
