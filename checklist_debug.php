<?php

$templates = App\Models\ChecklistTemplate::withCount('questions')->get();
echo "Templates:\n";
foreach ($templates as $t) {
    echo "- {$t->name}: {$t->questions_count} questions\n";
}

$users = App\Models\DirectoryUser::withCount([
    'checklistSubmissions as total',
    'checklistSubmissions as completed' => function ($q) {
        $q->where('status', 'completed');
    },
])->get();

echo "\nUsers:\n";
foreach ($users as $u) {
    if ($u->total > 0) {
        echo "- {$u->name}: {$u->completed}/{$u->total} checklists\n";
    }
}
